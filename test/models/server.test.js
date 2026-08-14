const { test } = require('node:test');
const assert = require('node:assert/strict');
const Server = require('../../src/models/server');
const { createCompositionRoot } = require('../../src/compositionRoot');
const {
    createTestAppConfig
} = require('../fixtures/appConfig');

const withHttpServer = async (server, work) => {
    const listener = server.app.listen(0);
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

test('espera la conexión a MongoDB antes de abrir el puerto', async () => {
    const events = [];
    let releaseConnection;

    const connection = async () => {
        events.push('connection:start');
        await new Promise(resolve => {
            releaseConnection = resolve;
        });
        events.push('connection:end');
    };

    const server = new Server({
        config: createTestAppConfig(),
        connection,
        port: 3001
    });

    server.app.listen = (port, callback) => {
        events.push(`listen:${port}`);
        callback();
        return { close: () => {} };
    };

    const startPromise = server.start();
    await new Promise(resolve => setImmediate(resolve));

    assert.deepEqual(events, ['connection:start']);

    releaseConnection();
    await startPromise;

    assert.deepEqual(events, [
        'connection:start',
        'connection:end',
        'listen:3001'
    ]);
});

test('utiliza el puerto numérico de la configuración validada', () => {
    const config = createTestAppConfig({ PORT: '4321' });
    const server = new Server({
        config,
        connection: async () => {}
    });

    assert.equal(server.port, 4321);
    assert.equal(server.config, config);
});

test('no abre el puerto cuando falla la conexión a MongoDB', async () => {
    const connectionError = new Error('MongoDB no disponible');
    const server = new Server({
        config: createTestAppConfig(),
        connection: async () => {
            throw connectionError;
        },
        port: 3001
    });
    let listenWasCalled = false;

    server.app.listen = () => {
        listenWasCalled = true;
    };

    await assert.rejects(server.start(), connectionError);
    assert.equal(listenWasCalled, false);
});

test('registra los manejadores de errores después de todas las rutas', () => {
    const server = new Server({
        config: createTestAppConfig(),
        connection: async () => {},
        port: 3001
    });
    const middlewareNames = server.app._router.stack.map(layer => layer.name);

    assert.deepEqual(
        middlewareNames.slice(-2),
        ['notFoundHandler', 'errorHandler']
    );

    const lastRouterIndex = middlewareNames.lastIndexOf('router');
    const notFoundIndex = middlewareNames.lastIndexOf('notFoundHandler');

    assert.ok(lastRouterIndex >= 0);
    assert.ok(lastRouterIndex < notFoundIndex);
});

test('activa encabezados defensivos y CORS para el frontend local', async () => {
    const server = new Server({ config: createTestAppConfig() });

    await withHttpServer(server, async baseUrl => {
        const response = await fetch(`${baseUrl}/ruta-inexistente`, {
            headers: { Origin: 'http://localhost:5173' }
        });

        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
        assert.equal(response.headers.get('x-powered-by'), null);
        assert.equal(
            response.headers.get('access-control-allow-origin'),
            'http://localhost:5173'
        );
        assert.equal(
            response.headers.get('access-control-expose-headers'),
            null
        );
    });
});

test('no configura trust proxy mientras el rate limiting está apagado', () => {
    const compositionRoot = createCompositionRoot({
        infrastructure: {
            config: createTestAppConfig(),
            httpSecurityConfig: {
                corsAllowLocalhost: true,
                corsAllowedOrigins: [],
                jsonBodyLimit: '100kb',
                rateLimitEnabled: false,
                trustProxyHops: 3
            }
        }
    });
    const server = new Server({ compositionRoot });

    assert.equal(server.app.get('trust proxy'), false);
    assert.equal(compositionRoot.middleware.globalRateLimiter, null);
});

test('rechaza cuerpos JSON que superan el límite configurado', async () => {
    const compositionRoot = createCompositionRoot({
        infrastructure: {
            config: createTestAppConfig(),
            httpSecurityConfig: {
                corsAllowLocalhost: true,
                corsAllowedOrigins: [],
                jsonBodyLimit: '1kb',
                rateLimitEnabled: false,
                trustProxyHops: 0
            }
        }
    });
    const server = new Server({ compositionRoot });

    await withHttpServer(server, async baseUrl => {
        const response = await fetch(`${baseUrl}/api/v2/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: 'x'.repeat(2048) })
        });
        const body = await response.json();

        assert.equal(response.status, 413);
        assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
    });
});

test('rechaza la configuración inválida antes de construir Express', () => {
    assert.throws(
        () => new Server({ env: {} }),
        error => {
            assert.equal(error.code, 'INVALID_CONFIGURATION');
            assert.deepEqual(
                error.details.map(detail => detail.variable),
                ['PORT', 'DATABASE_URL', 'JWT_SECRET']
            );
            return true;
        }
    );
});

test('monta exclusivamente la API v2 y conserva su contrato', async () => {
    const compositionRoot = createCompositionRoot({
        infrastructure: { config: createTestAppConfig() },
        services: {
            auth: {
                async login() {
                    return 'token-v2';
                }
            },
            debt: {
                async getAllDebts() {
                    return {
                        count: 0,
                        debts: [],
                        pagination: {
                            page: 1,
                            limit: 20,
                            totalPages: 0
                        }
                    };
                }
            },
            group: {
                async getGroupsForUser() {
                    return {
                        count: 0,
                        groups: [],
                        pagination: {
                            page: 1,
                            limit: 20,
                            totalPages: 0
                        }
                    };
                }
            },
            user: {
                async createUser(data) {
                    return {
                        uid: 'user-v2',
                        ...data,
                        state: true,
                        owe: 0,
                        owes: 0
                    };
                }
            }
        },
        middleware: {
            authVerify(req, res, next) {
                req.user = { userId: 'user-v2' };
                next();
            }
        }
    });
    const server = new Server({ compositionRoot });

    await withHttpServer(server, async baseUrl => {
        const request = path => fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'user@example.com',
                password: 'password'
            })
        });
        const v2Response = await request('/api/v2/auth/login');
        const userResponse = await fetch(`${baseUrl}/api/v2/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Usuario V2',
                nickname: 'UsuarioV2',
                email: 'UsuarioV2@example.com',
                password: '12345678'
            })
        });
        const groupResponse = await fetch(`${baseUrl}/api/v2/group`);
        const debtResponse = await fetch(`${baseUrl}/api/v2/payment`);

        assert.deepEqual(await v2Response.json(), {
            success: true,
            data: { token: 'token-v2' }
        });
        assert.equal(userResponse.status, 201);
        assert.equal((await userResponse.json()).data.id, 'user-v2');
        assert.equal(groupResponse.status, 200);
        assert.deepEqual((await groupResponse.json()).data, []);
        assert.equal(debtResponse.status, 200);
        assert.deepEqual((await debtResponse.json()).data, []);
        assert.equal(v2Response.headers.get('deprecation'), null);
        assert.equal(v2Response.headers.get('link'), null);
        assert.equal(v2Response.headers.get('sunset'), null);
    });
});

test('las rutas retiradas responden 404 ROUTE_NOT_FOUND', async () => {
    const compositionRoot = createCompositionRoot({
        infrastructure: { config: createTestAppConfig() }
    });
    const server = new Server({ compositionRoot });

    assert.deepEqual(Object.keys(compositionRoot.controllers), ['v2']);
    assert.deepEqual(Object.keys(compositionRoot.routers), ['v2']);
    assert.equal('legacyApi' in compositionRoot.middleware, false);

    await withHttpServer(server, async baseUrl => {
        const paths = [
            '/api/auth',
            '/api/user',
            '/api/group',
            '/api/payment',
            '/api/group/mygroups'
        ];

        for (const path of paths) {
            const response = await fetch(`${baseUrl}${path}`);
            const body = await response.json();

            assert.equal(response.status, 404, path);
            assert.equal(body.error.code, 'ROUTE_NOT_FOUND', path);
            assert.equal(response.headers.get('deprecation'), null, path);
            assert.equal(response.headers.get('link'), null, path);
            assert.equal(response.headers.get('sunset'), null, path);
        }
    });
});
