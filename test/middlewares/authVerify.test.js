const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const userRepository = require('../../src/repositories/user');
const { authVerify } = require('../../src/middlewares/authVerify');
const { errorHandler } = require('../../src/middlewares/errorHandler');

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
        headersSent: false,
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
        if (error) {
            result.error = error;
            return errorHandler(error, req, res, () => {});
        }

        result.nextCalled = true;
        result.user = req.user;
    });

    return result;
};

describe('authVerify', () => {
    let previousSecret;
    let previousFindActiveById;

    beforeEach(() => {
        previousSecret = process.env.JWT_SECRET;
        process.env.JWT_SECRET = JWT_SECRET;
        previousFindActiveById = userRepository.findActiveById;
        userRepository.findActiveById = async id => ({
            _id: id,
            nickname: 'usuario',
            state: true
        });
    });

    afterEach(() => {
        userRepository.findActiveById = previousFindActiveById;

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
        assert.equal(result.body.error.code, 'TOKEN_FORMAT_INVALID');
        assert.match(
            result.body.error.message,
            /formato de autorización inválido/i
        );
    });

    it('rechaza un token inválido o expirado', async () => {
        const expiredToken = jwt.sign(
            { userId: 'user-1' },
            JWT_SECRET,
            { expiresIn: -1 }
        );

        const result = await executeMiddleware(`Bearer ${expiredToken}`);

        assert.equal(result.statusCode, 401);
        assert.equal(result.body.error.code, 'TOKEN_INVALID_OR_EXPIRED');
        assert.match(result.body.error.message, /inválido o expirado/i);
    });

    it('rechaza un JWT válido que no contenga userId', async () => {
        const token = jwt.sign({ nick: 'usuario' }, JWT_SECRET);
        const result = await executeMiddleware(`Bearer ${token}`);

        assert.equal(result.statusCode, 401);
        assert.equal(result.nextCalled, false);
        assert.equal(result.body.error.code, 'TOKEN_INVALID');
    });

    it('rechaza un JWT perteneciente a un usuario desactivado', async () => {
        userRepository.findActiveById = async () => null;
        const token = jwt.sign(
            { userId: 'user-1', nick: 'usuario' },
            JWT_SECRET
        );

        const result = await executeMiddleware(`Bearer ${token}`);

        assert.equal(result.statusCode, 401);
        assert.equal(result.nextCalled, false);
        assert.equal(result.body.error.code, 'TOKEN_USER_INACTIVE');
        assert.match(result.body.error.message, /desactivado/i);
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
