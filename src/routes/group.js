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
router.post('/addMember', authVerify, addMember);
router.put('/:id', updateGroup)
router.delete('/:id', deleteGroup)

module.exports= router