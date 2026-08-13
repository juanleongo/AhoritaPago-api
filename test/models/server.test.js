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
            'Deprecation,Link,Sunset'
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
        const response = await fetch(`${baseUrl}/api/user`, {
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

test('expone autenticación v2 sin retirar la ruta legacy', async () => {
    const compositionRoot = createCompositionRoot({
        infrastructure: { config: createTestAppConfig() },
        services: {
            auth: {
                async login() {
                    return 'token-v2';
                }
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
        const [legacyResponse, v2Response] = await Promise.all([
            request('/api/auth/login'),
            request('/api/v2/auth/login')
        ]);

        assert.deepEqual(await legacyResponse.json(), {
            token: 'token-v2'
        });
        assert.deepEqual(await v2Response.json(), {
            success: true,
            data: { token: 'token-v2' }
        });
    });
});
