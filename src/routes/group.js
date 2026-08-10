const {Router} = require('express')
const {
    allowOnlyFields,
    authVerify,
    validateForms
} = require('../middlewares');
const {
    addGroupMemberValidators,
    createGroupValidators,
    groupIdValidators,
    updateGroupValidators
} = require('../validators/groupValidators');

const {addMember, getAllGroups ,getGroupById, createGroup,updateGroup,deleteGroup, getUserGroups} = require('../controllers/group');

const router = Router()

// Todas las operaciones de grupos requieren un JWT válido.
router.use(authVerify)

router.get('/mygroups', getUserGroups);
router.get('/', getAllGroups)
router.get('/:id', [
    ...groupIdValidators,
    validateForms
], getGroupById)

router.post('/', [
    allowOnlyFields(['name']),
    ...createGroupValidators,
    validateForms
], createGroup);

router.post('/addMember', [
    allowOnlyFields(['groupCode', 'userNick']),
    ...addGroupMemberValidators,
    validateForms
], addMember);
router.put('/:id', [
    allowOnlyFields(['name']),
    ...updateGroupValidators,
    validateForms
], updateGroup)
router.delete('/:id', [
    allowOnlyFields([]),
    ...groupIdValidators,
    validateForms
], deleteGroup)

module.exports= router
