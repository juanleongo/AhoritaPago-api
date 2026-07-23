// src/routes/debt.js
const { Router } = require('express');
const { check } = require('express-validator');
const { validateForms, authVerify } = require('../middlewares');

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

router.get('/summary', [
    validateForms
], getDebtSummary);

router.get('/history', getDebtHistory);

router.get('/group/:groupCode', [
    validateForms
], getDebtsInGroup);


// 2. Rutas dinámicas (que usan un parámetro como :id)
// se definen DESPUÉS de las rutas específicas.

router.get('/:id', getDebtById);


// --- Resto de las rutas ---

router.get('/', [ 
    validateForms
], getAllDebts);

router.post('/', [ 
    check('description','la descripcion es obligatoria').not().isEmpty(),
    validateForms
], createDebt);

router.put('/:id',[ 
    validateForms
], updateDebt);

router.put('/pay/:id',[ 
    validateForms
], markAsPay);

router.delete('/:id', deleteDebt);

module.exports = router;
