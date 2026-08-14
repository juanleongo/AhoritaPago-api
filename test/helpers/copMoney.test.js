const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    MAX_COP_AMOUNT,
    isValidCopAmount,
    parseCopAmount,
    toCopNumber
} = require('../../src/helpers/copMoney');

describe('representación monetaria COP', () => {
    it('acepta enteros y separadores de miles colombianos', () => {
        assert.equal(parseCopAmount(1000), 1000);
        assert.equal(parseCopAmount('1000'), 1000);
        assert.equal(parseCopAmount('1.500'), 1500);
        assert.equal(parseCopAmount('1.250.000'), 1250000);
    });

    it('rechaza decimales, formatos ambiguos y valores no positivos', () => {
        [
            0,
            -1,
            1.5,
            '1.5',
            '1,500',
            '1,50',
            'COP 1.500',
            Infinity
        ].forEach(value => assert.equal(isValidCopAmount(value), false));
    });

    it('limita los importes al rango de enteros seguros', () => {
        assert.equal(parseCopAmount(MAX_COP_AMOUNT), MAX_COP_AMOUNT);
        assert.throws(() => parseCopAmount(9007199254740992n), RangeError);
    });

    it('convierte BigInt y BSON Long sin aceptar texto almacenado', () => {
        const longLikeValue = { toBigInt: () => 1500n };

        assert.equal(toCopNumber(1500n), 1500);
        assert.equal(toCopNumber(longLikeValue), 1500);
        assert.throws(() => toCopNumber('1500'), TypeError);
        assert.equal(toCopNumber(0, { allowZero: true }), 0);
    });
});
