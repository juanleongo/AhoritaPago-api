const { Router } = require('express');
const {
    allowOnlyFields
} = require('../../middlewares/allowOnlyFields');
const { validateForms } = require('../../middlewares/validate-forms');
const {
    createUserValidators,
    nicknameLookupValidators,
    searchUsersValidators,
    updateUserValidators,
    userIdValidators
} = require('../../validators/userValidators');
const {
    searchPaginationValidators
} = require('../../validators/paginationValidators');

const createUserRouter = ({
    authVerify,
    registrationRateLimiter,
    userController
}) => {
    const router = Router();
    const registrationMiddleware = [
        registrationRateLimiter,
        allowOnlyFields(['name', 'nickname', 'email', 'password']),
        ...createUserValidators,
        validateForms
    ].filter(Boolean);

    router.post('/', registrationMiddleware, userController.createUser);

    router.use(authVerify);

    router.get('/nick', [
        allowOnlyFields(['nick']),
        ...nicknameLookupValidators,
        validateForms
    ], userController.getByNickname);
    router.get('/search/:searchTerm', [
        allowOnlyFields(['page', 'limit'], 'query'),
        ...searchUsersValidators,
        ...searchPaginationValidators,
        validateForms
    ], userController.searchUsers);
    router.get('/:id', [
        ...userIdValidators,
        validateForms
    ], userController.getUserById);
    router.get('/', userController.getUserByToken);
    router.put('/:id', [
        allowOnlyFields(['name', 'nickname', 'email']),
        ...updateUserValidators,
        validateForms
    ], userController.updateUser);
    router.delete('/:id', [
        allowOnlyFields([]),
        ...userIdValidators,
        validateForms
    ], userController.deleteUser);

    return router;
};

module.exports = { createUserRouter };
