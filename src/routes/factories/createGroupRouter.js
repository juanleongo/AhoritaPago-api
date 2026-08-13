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
const {
    listPaginationValidators
} = require('../../validators/paginationValidators');

const createGroupRouter = ({
    authVerify,
    groupController,
    includeDeprecatedAliases = true
}) => {
    const router = Router();

    router.use(authVerify);

    const listGroupsMiddleware = [
        allowOnlyFields(['page', 'limit'], 'query'),
        ...listPaginationValidators,
        validateForms
    ];

    if (includeDeprecatedAliases) {
        router.get(
            '/mygroups',
            listGroupsMiddleware,
            groupController.getGroupsForUser
        );
    }
    router.get('/', listGroupsMiddleware, groupController.getGroupsForUser);
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
