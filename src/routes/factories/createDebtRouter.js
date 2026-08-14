const { Router } = require('express');
const {
    allowOnlyFields
} = require('../../middlewares/allowOnlyFields');
const { validateForms } = require('../../middlewares/validate-forms');
const {
    createDebtValidators,
    debtIdValidators,
    updateDebtValidators
} = require('../../validators/debtValidators');
const {
    groupCodeValidators
} = require('../../validators/groupValidators');
const {
    historyPaginationValidators,
    listPaginationValidators,
    summaryPaginationValidators
} = require('../../validators/paginationValidators');

const createDebtRouter = ({ authVerify, debtController }) => {
    const router = Router();

    router.use(authVerify);

    router.get('/summary', [
        allowOnlyFields(['debtsPage', 'creditsPage', 'limit'], 'query'),
        ...summaryPaginationValidators,
        validateForms
    ], debtController.getDebtSummary);
    router.get('/history', [
        allowOnlyFields(['activePage', 'paidPage', 'limit'], 'query'),
        ...historyPaginationValidators,
        validateForms
    ], debtController.getDebtHistory);
    router.get('/group/:groupCode', [
        allowOnlyFields(['page', 'limit'], 'query'),
        ...groupCodeValidators,
        ...listPaginationValidators,
        validateForms
    ], debtController.getDebtsInGroup);
    router.get('/:id', [
        ...debtIdValidators,
        validateForms
    ], debtController.getDebtById);
    router.get('/', [
        allowOnlyFields(['page', 'limit'], 'query'),
        ...listPaginationValidators,
        validateForms
    ], debtController.getAllDebts);

    router.post('/', [
        allowOnlyFields(['description', 'value', 'group', 'debtor']),
        ...createDebtValidators,
        validateForms
    ], debtController.createDebt);

    router.put('/:id', [
        allowOnlyFields(['description']),
        ...updateDebtValidators,
        validateForms
    ], debtController.updateDebt);
    router.put('/pay/:id', [
        allowOnlyFields([]),
        ...debtIdValidators,
        validateForms
    ], debtController.markAsPay);

    return router;
};

module.exports = { createDebtRouter };
