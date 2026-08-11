const { test } = require('node:test');
const assert = require('node:assert/strict');
const Server = require('../../src/models/server');

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

    const server = new Server({ connection, port: 3001 });

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

test('no abre el puerto cuando falla la conexión a MongoDB', async () => {
    const connectionError = new Error('MongoDB no disponible');
    const server = new Server({
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
