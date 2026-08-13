const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createDebtService } = require(
    '../../src/services/debt/createDebtService'
);
const { createCreateDebt } = require('../../src/services/debt/createDebt');
const { createDeleteDebt } = require('../../src/services/debt/deleteDebt');
const { createGetAllDebts } = require('../../src/services/debt/getAllDebts');
const { createGetDebtById } = require('../../src/services/debt/getDebtById');
const {
    createGetDebtHistoryForUser
} = require('../../src/services/debt/getDebtHistoryForUser');
const {
    createGetDebtSummaryForUser
} = require('../../src/services/debt/getDebtSummaryForUser');
const {
    createGetDebtsForUserInGroupByCode
} = require('../../src/services/debt/getDebtsForUserInGroupByCode');
const { createMarkAsPaid } = require('../../src/services/debt/markAsPaid');
const { createUpdateDebt } = require('../../src/services/debt/updateDebt');

describe('estructura modular del servicio de deudas', () => {
    it('mantiene exactamente la API pública del servicio construido', () => {
        const debtService = createDebtService({
            debtRepository: {},
            groupRepository: {},
            transactionManager: {},
            userService: {}
        });

        assert.deepEqual(Object.keys(debtService).sort(), [
            'createDebt',
            'deleteDebt',
            'getAllDebts',
            'getDebtById',
            'getDebtHistoryForUser',
            'getDebtSummaryForUser',
            'getDebtsForUserInGroupByCode',
            'markAsPaid',
            'updateDebt'
        ]);
    });

    it('expone una fábrica por cada caso de uso independiente', () => {
        [
            createDebtService,
            createCreateDebt,
            createDeleteDebt,
            createGetAllDebts,
            createGetDebtById,
            createGetDebtHistoryForUser,
            createGetDebtSummaryForUser,
            createGetDebtsForUserInGroupByCode,
            createMarkAsPaid,
            createUpdateDebt
        ].forEach(factory => assert.equal(typeof factory, 'function'));
    });
});
