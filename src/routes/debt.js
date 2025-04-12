const {Router} = require('express')
const { check } = require('express-validator');
const { validateForms, authVerify } = require('../middlewares');

const {getAllDebts,getDebtById,createDebt,updateDebt,deleteDebt,markAsPayid} = require('../controllers/debt');

const router = Router()

router.get('/', getAllDebts)
router.get('/:id', getDebtById)
router.post('/', [ 
    authVerify,
    check('description','la descripcion es obligatoria').not().isEmpty(),
    validateForms
], createDebt);
router.put('/:id', updateDebt)
router.put('/:id/pay', markAsPayid)
router.delete('/:id', deleteDebt)

module.exports= router