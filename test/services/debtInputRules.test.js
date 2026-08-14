const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createCreateDebt } = require('../../src/services/debt/createDebt');

const creditorId = '507f1f77bcf86cd799439011';
const debtorId = '507f191e810c19729de860ea';

const buildDebt = changes => ({
    description: 'Cena',
    debtor: [debtorId],
    group: '507f191e810c19729de860eb',
    value: 100,
    ...changes
});

const rejectsCode = errorCode => error => error.errorCode === errorCode;

describe('createDebt: reglas defensivas de entrada', () => {
    const createDebt = createCreateDebt({});

    it('requiere el acreedor obtenido de la autenticación', async () => {
        await assert.rejects(
            () => createDebt(buildDebt(), {}),
            rejectsCode('DEBT_CREDITOR_REQUIRED')
        );
    });

    it('rechaza valores que no sean enteros COP positivos y seguros', async () => {
        for (const value of [0, -1, 1.5, Infinity]) {
            await assert.rejects(
                () => createDebt(buildDebt({ value }), { userId: creditorId }),
                rejectsCode('DEBT_VALUE_INVALID')
            );
        }
    });

    it('rechaza deudores repetidos', async () => {
        await assert.rejects(
            () => createDebt(
                buildDebt({ debtor: [debtorId, debtorId] }),
                { userId: creditorId }
            ),
            rejectsCode('DEBTOR_DUPLICATED')
        );
    });

    it('impide que el acreedor también sea deudor', async () => {
        await assert.rejects(
            () => createDebt(
                buildDebt({ debtor: [creditorId] }),
                { userId: creditorId }
            ),
            rejectsCode('CREDITOR_CANNOT_BE_DEBTOR')
        );
    });
});
