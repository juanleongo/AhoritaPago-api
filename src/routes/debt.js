const { Router } = require('express');
const {
    allowOnlyFields,
    authVerify: defaultAuthVerify,
    validateForms
} = require('../middlewares');
const defaultDebtController = require('../controllers/debt');
const {
    createDebtValidators,
    debtIdValidators,
    updateDebtValidators
} = require('../validators/debtValidators');
const { groupCodeValidators } = require('../validators/groupValidators');

const createDebtRouter = ({ authVerify, debtController }) => {
    const router = Router();

    router.use(authVerify);

    router.get('/summary', debtController.getDebtSummary);
    router.get('/history', debtController.getDebtHistory);
    router.get('/group/:groupCode', [
        ...groupCodeValidators,
        validateForms
    ], debtController.getDebtsInGroup);
    router.get('/:id', [
        ...debtIdValidators,
        validateForms
    ], debtController.getDebtById);
    router.get('/', debtController.getAllDebts);

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
    router.delete('/:id', [
        allowOnlyFields([]),
        ...debtIdValidators,
        validateForms
    ], debtController.deleteDebt);

    return router;
};

const router = createDebtRouter({
    authVerify: defaultAuthVerify,
    debtController: defaultDebtController
});

module.exports = router;
module.exports.createDebtRouter = createDebtRouter;
