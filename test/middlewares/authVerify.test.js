const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { authVerify } = require('../../src/middlewares/authVerify');

const JWT_SECRET = 'test-secret';

const executeMiddleware = (authorization) => {
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

    authVerify(req, res, () => {
        result.nextCalled = true;
        result.user = req.user;
    });

    return result;
};

describe('authVerify', () => {
    let previousSecret;

    beforeEach(() => {
        previousSecret = process.env.JWT_SECRET;
        process.env.JWT_SECRET = JWT_SECRET;
    });

    afterEach(() => {
        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = previousSecret;
        }
    });

    it('rechaza una solicitud sin encabezado Authorization', () => {
        const result = executeMiddleware(undefined);

        assert.equal(result.statusCode, 401);
        assert.equal(result.nextCalled, false);
    });

    it('rechaza un encabezado que no use Bearer', () => {
        const result = executeMiddleware('Basic credentials');

        assert.equal(result.statusCode, 401);
        assert.match(result.body.msg, /formato de autorización inválido/i);
    });

    it('rechaza un token inválido o expirado', () => {
        const expiredToken = jwt.sign(
            { userId: 'user-1' },
            JWT_SECRET,
            { expiresIn: -1 }
        );

        const result = executeMiddleware(`Bearer ${expiredToken}`);

        assert.equal(result.statusCode, 401);
        assert.match(result.body.msg, /inválido o expirado/i);
    });

    it('rechaza un JWT válido que no contenga userId', () => {
        const token = jwt.sign({ nick: 'usuario' }, JWT_SECRET);
        const result = executeMiddleware(`Bearer ${token}`);

        assert.equal(result.statusCode, 401);
        assert.equal(result.nextCalled, false);
    });

    it('continúa y adjunta el usuario cuando el JWT es válido', () => {
        const token = jwt.sign(
            { userId: 'user-1', nick: 'usuario' },
            JWT_SECRET
        );

        const result = executeMiddleware(`Bearer ${token}`);

        assert.equal(result.statusCode, null);
        assert.equal(result.nextCalled, true);
        assert.equal(result.user.userId, 'user-1');
    });
});
