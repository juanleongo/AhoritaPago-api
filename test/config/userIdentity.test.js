const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    USER_IDENTITY_LIMITS,
    normalizeEmail,
    normalizeName,
    normalizeNickname
} = require('../../src/config/userIdentity');

describe('política de identidad de usuarios', () => {
    it('preserva las mayúsculas de email y nickname', () => {
        assert.equal(
            normalizeEmail('  lomasFresa@gmail.com  '),
            'lomasFresa@gmail.com'
        );
        assert.equal(normalizeNickname('  LEON  '), 'LEON');
        assert.notEqual(normalizeNickname('leon'), normalizeNickname('LEON'));
    });

    it('normaliza únicamente la presentación del nombre', () => {
        assert.equal(
            normalizeName('  Laura   De León  '),
            'Laura De León'
        );
    });

    it('define ocho caracteres como única política de contraseña nueva', () => {
        assert.deepEqual(USER_IDENTITY_LIMITS.password, { minLength: 8 });
    });
});
