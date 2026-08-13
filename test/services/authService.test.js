const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createAuthService
} = require('../../src/services/factories/createAuthService');

describe('authService: identidad sensible a mayúsculas', () => {
    it('recorta el email sin cambiar su capitalización', async () => {
        let receivedEmail;
        const service = createAuthService({
            userRepository: {
                async findByEmail(email) {
                    receivedEmail = email;
                    return {
                        _id: 'user-1',
                        nickname: 'LEON',
                        password: 'hash',
                        state: true
                    };
                }
            },
            passwordHasher: { compare: async () => true },
            tokenProvider: { sign: () => 'token' },
            getJwtSecret: () => 'secret'
        });

        const token = await service.login('  User@Example.com  ', 'x');

        assert.equal(receivedEmail, 'User@Example.com');
        assert.equal(token, 'token');
    });
});
