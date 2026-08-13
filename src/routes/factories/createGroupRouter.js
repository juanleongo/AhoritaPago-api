const { Router } = require('express');
const {
    allowOnlyFields
} = require('../../middlewares/allowOnlyFields');
const { validateForms } = require('../../middlewares/validate-forms');
const {
    createDeprecateEndpoint
} = require('../../middlewares/deprecateEndpoint');
const {
    addGroupMemberValidators,
    createGroupValidators,
    groupIdValidators,
    updateGroupValidators
} = require('../../validators/groupValidators');

const deprecateMyGroups = createDeprecateEndpoint({
    deprecationDate: '2026-08-12T00:00:00Z',
    successorPath: '/api/group'
});

const createGroupRouter = ({ authVerify, groupController }) => {
    const router = Router();

    router.use(authVerify);

    router.get(
        '/mygroups',
        deprecateMyGroups,
        groupController.getGroupsForUser
    );
    router.get('/', groupController.getGroupsForUser);
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
