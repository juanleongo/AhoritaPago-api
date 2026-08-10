// src/routes/debt.js
const { Router } = require('express');
const {
    allowOnlyFields,
    authVerify,
    validateForms
} = require('../middlewares');
const {
    createDebtValidators,
    debtIdValidators,
    updateDebtValidators
} = require('../validators/debtValidators');
const { groupCodeValidators } = require('../validators/groupValidators');

const {
    getAllDebts,
    getDebtById,
    createDebt,
    updateDebt,
    deleteDebt,
    markAsPay,
    getDebtSummary,
    getDebtHistory,
    getDebtsInGroup
} = require('../controllers/debt');

const router = Router();

// Todas las operaciones de deudas y pagos requieren un JWT válido.
router.use(authVerify);

router.get('/summary', getDebtSummary);

router.get('/history', getDebtHistory);

router.get('/group/:groupCode', [
    ...groupCodeValidators,
    validateForms
], getDebtsInGroup);


// 2. Rutas dinámicas (que usan un parámetro como :id)
// se definen DESPUÉS de las rutas específicas.

router.get('/:id', [
    ...debtIdValidators,
    validateForms
], getDebtById);


// --- Resto de las rutas ---

router.get('/', getAllDebts);

router.post('/', [
    allowOnlyFields(['description', 'value', 'group', 'debtor']),
    ...createDebtValidators,
    validateForms
], createDebt);

router.put('/:id', [
    allowOnlyFields(['description']),
    ...updateDebtValidators,
    validateForms
], updateDebt);

router.put('/pay/:id', [
    allowOnlyFields([]),
    ...debtIdValidators,
    validateForms
], markAsPay);

router.delete('/:id', [
    allowOnlyFields([]),
    ...debtIdValidators,
    validateForms
], deleteDebt);

module.exports = router;
