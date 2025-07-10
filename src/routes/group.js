const {Router} = require('express')
const { check } = require('express-validator');
const { validateForms, authVerify } = require('../middlewares');

const {addMember, getAllGroups ,getGroupById, createGroup,updateGroup,deleteGroup} = require('../controllers/group');

const router = Router()

router.get('/', getAllGroups)
router.get('/:id', getGroupById)
router.post('/', [ 
    authVerify,
    check('name','El nombre es obligatorio').not().isEmpty(),
    validateForms
], createGroup);

router.post('/addMember',[ 
    authVerify,
    check('groupCode','El codigo del grupo es obligatorio').not().isEmpty(),
    check('userNick','El nombre del usuario es obligatorio').not().isEmpty(),
    validateForms
], addMember);
router.put('/:id', updateGroup)
router.delete('/:id', deleteGroup)

module.exports= router