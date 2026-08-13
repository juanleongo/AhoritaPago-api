const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
    createUserRouterV2
} = require('../../src/routes/v2/createUserRouter');
const {
    errorHandler,
    notFoundHandler
} = require('../../src/middlewares/errorHandler');

const withServer = async (router, work) => {
    const app = express();
    app.use('/api/v2/user', router);
    app.use(notFoundHandler);
    app.use(errorHandler);
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

const createRouter = getByNickname => createUserRouterV2({
    authVerify(req, res, next) {
        req.user = { userId: 'user-1' };
        next();
    },
    registrationRateLimiter: null,
    userController: {
        createUser() {},
        deleteUser() {},
        getByNickname,
        getUserById() {},
        getUserByToken() {},
        searchUsers() {},
        updateUser() {}
    }
});

describe('ruta v2 de búsqueda exacta por nickname', () => {
    it('obtiene el nickname del path sin requerir body GET', async () => {
        let receivedRequest;
        const router = createRouter((req, res) => {
            receivedRequest = req;
            res.status(200).json({ success: true, data: {} });
        });

        await withServer(router, async baseUrl => {
            const response = await fetch(
                `${baseUrl}/api/v2/user/by-nickname/leon`
            );

            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), {
                success: true,
                data: {}
            });
        });

        assert.equal(receivedRequest.body, undefined);
        assert.deepEqual(receivedRequest.validated.body, {});
        assert.deepEqual(receivedRequest.validated.params, {
            nickname: 'leon'
        });
    });

    it('valida el nickname antes de ejecutar el controlador', async () => {
        let calls = 0;
        const router = createRouter(() => {
            calls += 1;
        });

        await withServer(router, async baseUrl => {
            const response = await fetch(
                `${baseUrl}/api/v2/user/by-nickname/${'a'.repeat(51)}`
            );
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.equal(body.success, false);
            assert.equal(body.error.code, 'VALIDATION_ERROR');
        });

        assert.equal(calls, 0);
    });
});
