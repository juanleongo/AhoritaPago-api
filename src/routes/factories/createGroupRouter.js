const { Router } = require('express');
const {
    allowOnlyFields
} = require('../../middlewares/allowOnlyFields');
const { validateForms } = require('../../middlewares/validate-forms');
const {
    addGroupMemberValidators,
    createGroupValidators,
    groupIdValidators,
    updateGroupValidators
} = require('../../validators/groupValidators');

const createGroupRouter = ({ authVerify, groupController }) => {
    const router = Router();

    router.use(authVerify);

    router.get('/mygroups', groupController.getUserGroups);
    router.get('/', groupController.getAllGroups);
    router.get('/:id', [
        ...groupIdValidators,
        validateForms
    ], groupController.getGroupById);

    router.post('/', [
        allowOnlyFields(['name']),
        ...createGroupValidators,
        validateForms
    ], groupController.createGroup);

    router.post('/addMember', [
        allowOnlyFields(['groupCode', 'userNick']),
        ...addGroupMemberValidators,
        validateForms
    ], groupController.addMember);
    router.put('/:id', [
        allowOnlyFields(['name']),
        ...updateGroupValidators,
        validateForms
    ], groupController.updateGroup);
    router.delete('/:id', [
        allowOnlyFields([]),
        ...groupIdValidators,
        validateForms
    ], groupController.deleteGroup);

    return router;
};

module.exports = { createGroupRouter };
