const { test } = require('node:test');
const assert = require('node:assert/strict');
const { escapeRegex } = require('../../src/helpers/escapeRegex');

test('escapeRegex convierte una búsqueda en texto literal', () => {
    const input = 'usuario.*(admin)?[0]';
    const regex = new RegExp(escapeRegex(input), 'i');

    assert.equal(regex.test(input), true);
    assert.equal(regex.test('usuario-otro-admin-0'), false);
});
