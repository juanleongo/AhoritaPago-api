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
    getDebtsInGroup
} = require('../controllers/debt');

const router = Router();


router.get('/summary', [
    authVerify,
    validateForms
], getDebtSummary);

router.get('/group/:groupCode', [
    authVerify,
    validateForms
], getDebtsInGroup);


// 2. Rutas dinámicas (que usan un parámetro como :id)
// se definen DESPUÉS de las rutas específicas.

router.get('/:id', getDebtById);


// --- Resto de las rutas ---

router.get('/', [ 
    authVerify,
    validateForms
], getAllDebts);

router.post('/', [ 
    authVerify,
    check('description','la descripcion es obligatoria').not().isEmpty(),
    validateForms
], createDebt);

router.put('/:id',[ 
    authVerify,
    validateForms
], updateDebt);

router.put('/pay/:id',[ 
    authVerify,
    validateForms
], markAsPay);

router.delete('/:id', deleteDebt);

module.exports = router;