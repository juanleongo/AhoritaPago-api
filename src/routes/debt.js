const {Router} = require('express')
const { check } = require('express-validator');
const { validateForms, authVerify } = require('../middlewares');

const {getAllDebts,getDebtById,createDebt,updateDebt,deleteDebt,markAsPay,getDebtSummary} = require('../controllers/debt');

const router = Router()

router.get('/summary', [
    authVerify,   
    validateForms
], getDebtSummary);

router.get('/',[ 
    authVerify,
    //check('description','la descripcion es obligatoria').not().isEmpty(),
    validateForms
], getAllDebts)
router.get('/:id', getDebtById)
router.post('/', [ 
    authVerify,
    check('description','la descripcion es obligatoria').not().isEmpty(),
    validateForms
], createDebt);

router.put('/:id',[ 
    authVerify,
    //check('description','la descripcion es obligatoria').not().isEmpty(),
    validateForms
], updateDebt)

router.put('/pay/:id',[ 
    authVerify,
    //check('description','la descripcion es obligatoria').not().isEmpty(),
    validateForms
], markAsPay)
router.delete('/:id', deleteDebt)

module.exports= router