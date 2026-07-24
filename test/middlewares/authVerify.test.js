const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const userRepository = require('../../src/repositories/user');
const { authVerify } = require('../../src/middlewares/authVerify');

const JWT_SECRET = 'test-secret';

const executeMiddleware = async (authorization) => {
    const result = {
        nextCalled: false,
        statusCode: null,
        body: null
    };

    const req = {
        header: (name) => (
            name === 'Authorization' ? authorization : undefined
        )
    };

    const res = {
        status(statusCode) {
            result.statusCode = statusCode;
            return this;
        },
        json(body) {
            result.body = body;
            return this;
        }
    };

    await authVerify(req, res, error => {
        result.nextCalled = true;
        result.error = error;
        result.user = req.user;
    });

    return result;
};

describe('authVerify', () => {
    let previousSecret;
    let previousGetActiveUserById;

    beforeEach(() => {
        previousSecret = process.env.JWT_SECRET;
        process.env.JWT_SECRET = JWT_SECRET;
        previousGetActiveUserById = userRepository.getActiveUserById;
        userRepository.getActiveUserById = async id => ({
            _id: id,
            nickname: 'usuario',
            state: true
        });
    });

    afterEach(() => {
        userRepository.getActiveUserById = previousGetActiveUserById;

        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previousSecret;
        }
    });

    it('rechaza una solicitud sin encabezado Authorization', async () => {
        const result = await executeMiddleware(undefined);

        assert.equal(result.statusCode, 401);
        assert.equal(result.nextCalled, false);
    });

    it('rechaza un encabezado que no use Bearer', async () => {
        const result = await executeMiddleware('Basic credentials');

        assert.equal(result.statusCode, 401);
        assert.match(result.body.msg, /formato de autorización inválido/i);
    });

    it('rechaza un token inválido o expirado', async () => {
        const expiredToken = jwt.sign(
            { userId: 'user-1' },
            JWT_SECRET,
            { expiresIn: -1 }
        );

        const result = await executeMiddleware(`Bearer ${expiredToken}`);

        assert.equal(result.statusCode, 401);
        assert.match(result.body.msg, /inválido o expirado/i);
    });

    it('rechaza un JWT válido que no contenga userId', async () => {
        const token = jwt.sign({ nick: 'usuario' }, JWT_SECRET);
        const result = await executeMiddleware(`Bearer ${token}`);

        assert.equal(result.statusCode, 401);
        assert.equal(result.nextCalled, false);
    });

    it('rechaza un JWT perteneciente a un usuario desactivado', async () => {
        userRepository.getActiveUserById = async () => null;
        const token = jwt.sign(
            { userId: 'user-1', nick: 'usuario' },
            JWT_SECRET
        );

        const result = await executeMiddleware(`Bearer ${token}`);

        assert.equal(result.statusCode, 401);
        assert.equal(result.nextCalled, false);
        assert.match(result.body.msg, /desactivado/i);
    });

    it('continúa y adjunta el usuario cuando el JWT es válido', async () => {
        const token = jwt.sign(
            { userId: 'user-1', nick: 'usuario' },
            JWT_SECRET
        );

        const result = await executeMiddleware(`Bearer ${token}`);

        assert.equal(result.statusCode, null);
        assert.equal(result.nextCalled, true);
        assert.equal(result.user.userId, 'user-1');
    });
});
