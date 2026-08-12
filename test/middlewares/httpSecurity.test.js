const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createHttpSecurityConfig } = require('../../src/config/httpSecurity');
const {
    createHttpSecurity,
    isOriginAllowed
} = require('../../src/middlewares/factories/createHttpSecurity');
const {
    createAuthRouter
} = require('../../src/routes/factories/createAuthRouter');
const {
    createUserRouter
} = require('../../src/routes/factories/createUserRouter');

const withHttpApp = async (app, work) => {
    const listener = app.listen(0);
    await new Promise(resolve => listener.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${listener.address().port}`;

    try {
        await work(baseUrl);
    } finally {
        await new Promise((resolve, reject) => {
            listener.close(error => error ? reject(error) : resolve());
        });
    }
};

const createEnabledConfig = overrides => ({
    ...createHttpSecurityConfig({ RATE_LIMIT_ENABLED: 'true' }),
    globalRateLimitMax: 1,
    globalRateLimitWindowMs: 60000,
    loginRateLimitMax: 1,
    loginRateLimitWindowMs: 60000,
    registrationRateLimitMax: 1,
    registrationRateLimitWindowMs: 60000,
    ...overrides
});

describe('seguridad HTTP transversal', () => {
    it('no construye limitadores cuando están deshabilitados', () => {
        const security = createHttpSecurity(createHttpSecurityConfig({}));

        assert.equal(security.globalRateLimiter, null);
        assert.equal(security.loginRateLimiter, null);
        assert.equal(security.registrationRateLimiter, null);
    });

    it('permite frontend local y orígenes configurados, pero no otros', () => {
        const config = createHttpSecurityConfig({
            CORS_ALLOWED_ORIGINS: 'https://app.example.com'
        });

        assert.equal(isOriginAllowed(undefined, config), true);
        assert.equal(isOriginAllowed('http://localhost:5173', config), true);
        assert.equal(isOriginAllowed('http://127.0.0.1:3000', config), true);
        assert.equal(
            isOriginAllowed('https://app.example.com', config),
            true
        );
        assert.equal(isOriginAllowed('https://otro.example.com', config), false);
    });

    it('devuelve un error JSON al superar el límite global', async () => {
        const security = createHttpSecurity(createEnabledConfig());
        const app = express();
        app.use(security.globalRateLimiter);
        app.get('/resource', (req, res) => res.json({ success: true }));

        await withHttpApp(app, async baseUrl => {
            const firstResponse = await fetch(`${baseUrl}/resource`);
            const secondResponse = await fetch(`${baseUrl}/resource`);
            const body = await secondResponse.json();

            assert.equal(firstResponse.status, 200);
            assert.equal(secondResponse.status, 429);
            assert.equal(body.success, false);
            assert.equal(
                body.error.code,
                'GLOBAL_RATE_LIMIT_EXCEEDED'
            );
        });
    });

    it('distingue los límites de login y registro', async () => {
        const security = createHttpSecurity(createEnabledConfig());
        const app = express();
        app.post(
            '/login',
            security.loginRateLimiter,
            (req, res) => res.status(401).json({ success: false })
        );
        app.post(
            '/register',
            security.registrationRateLimiter,
            (req, res) => res.status(201).json({ success: true })
        );

        await withHttpApp(app, async baseUrl => {
            assert.equal(
                (await fetch(`${baseUrl}/login`, { method: 'POST' })).status,
                401
            );
            const blockedLogin = await fetch(`${baseUrl}/login`, {
                method: 'POST'
            });
            assert.equal(blockedLogin.status, 429);
            assert.equal(
                (await blockedLogin.json()).error.code,
                'LOGIN_RATE_LIMIT_EXCEEDED'
            );

            assert.equal(
                (await fetch(`${baseUrl}/register`, {
                    method: 'POST'
                })).status,
                201
            );
            const blockedRegistration = await fetch(`${baseUrl}/register`, {
                method: 'POST'
            });
            assert.equal(blockedRegistration.status, 429);
            assert.equal(
                (await blockedRegistration.json()).error.code,
                'REGISTRATION_RATE_LIMIT_EXCEEDED'
            );
        });
    });

    it('aplica el límite de login antes de validar credenciales', async () => {
        const security = createHttpSecurity(createEnabledConfig());
        let controllerWasCalled = false;
        const app = express();
        app.use(express.json());
        app.use('/api/auth', createAuthRouter({
            authController: {
                login(req, res) {
                    controllerWasCalled = true;
                    res.status(200).json({ success: true });
                }
            },
            loginRateLimiter(req, res) {
                res.status(429).json({
                    success: false,
                    error: { code: 'TEST_LOGIN_LIMIT' }
                });
            }
        }));

        await withHttpApp(app, async baseUrl => {
            const response = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            });
            const body = await response.json();

            assert.equal(response.status, 429);
            assert.equal(body.error.code, 'TEST_LOGIN_LIMIT');
            assert.equal(controllerWasCalled, false);
        });

        assert.ok(security.loginRateLimiter);
    });

    it('aplica el límite de registro antes de validar el body', async () => {
        let controllerWasCalled = false;
        const app = express();
        app.use(express.json());
        app.use('/api/user', createUserRouter({
            authVerify(req, res, next) {
                next();
            },
            registrationRateLimiter(req, res) {
                res.status(429).json({
                    success: false,
                    error: { code: 'TEST_REGISTRATION_LIMIT' }
                });
            },
            userController: {
                createUser(req, res) {
                    controllerWasCalled = true;
                    res.status(201).json({ success: true });
                },
                deleteUser() {},
                getByNickname() {},
                getUserById() {},
                getUserByToken() {},
                searchUsers() {},
                updateUser() {}
            }
        }));

        await withHttpApp(app, async baseUrl => {
            const response = await fetch(`${baseUrl}/api/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            });
            const body = await response.json();

            assert.equal(response.status, 429);
            assert.equal(body.error.code, 'TEST_REGISTRATION_LIMIT');
            assert.equal(controllerWasCalled, false);
        });
    });
});
