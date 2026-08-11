const { test } = require('node:test');
const assert = require('node:assert/strict');
const Server = require('../../src/models/server');
const {
    createTestAppConfig
} = require('../fixtures/appConfig');

const withHttpServer = async work => {
    const instance = new Server({ config: createTestAppConfig() });
    const listener = instance.app.listen(0);
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

test('el registro rechaza campos internos antes de consultar MongoDB', async () => {
    await withHttpServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Laura',
                nickname: 'laura',
                email: 'laura@example.com',
                password: 'secreto',
                state: false,
                owe: 999999
            })
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'UNKNOWN_FIELDS');
        assert.deepEqual(body.error.details, [
            { path: 'state', location: 'body' },
            { path: 'owe', location: 'body' }
        ]);
    });
});

test('el registro devuelve VALIDATION_ERROR para datos inválidos', async () => {
    await withHttpServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Laura',
                nickname: 'laura',
                email: 'correo-invalido',
                password: 'secreto'
            })
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'VALIDATION_ERROR');
        assert.equal(
            body.error.details.some(detail => detail.path === 'email'),
            true
        );
    });
});

test('login no devuelve la contraseña dentro de errores de validación', async () => {
    await withHttpServer(async baseUrl => {
        const password = { contenido: 'secreto' };
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'usuario@example.com',
                password
            })
        });
        const responseText = await response.text();
        const body = JSON.parse(responseText);

        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'VALIDATION_ERROR');
        assert.equal(responseText.includes('secreto'), false);
    });
});
