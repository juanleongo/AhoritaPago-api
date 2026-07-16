const {Router} = require('express')
const { check } = require('express-validator');
const { validateForms, authVerify } = require('../middlewares');

const {addMember, getAllGroups ,getGroupById, createGroup,updateGroup,deleteGroup, getUserGroups} = require('../controllers/group');

const router = Router()

// Todas las operaciones de grupos requieren un JWT válido.
router.use(authVerify)

router.get('/mygroups', [
    validateForms 
], getUserGroups);
router.get('/', getAllGroups)
router.get('/:id', getGroupById)

router.post('/', [ 
    check('name','El nombre es obligatorio').not().isEmpty(),
    validateForms
], createGroup);

router.post('/addMember',[ 
    check('groupCode','El codigo del grupo es obligatorio').not().isEmpty(),
    check('userNick','El nombre del usuario es obligatorio').not().isEmpty(),
    validateForms
], addMember);
router.put('/:id', updateGroup)
router.delete('/:id', deleteGroup)

module.exports= router
