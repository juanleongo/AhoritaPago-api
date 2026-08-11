const { Router } = require('express');
const {
    allowOnlyFields,
    authVerify: defaultAuthVerify,
    validateForms
} = require('../middlewares');
const defaultUserController = require('../controllers/user');
const {
    createUserValidators,
    nicknameLookupValidators,
    searchUsersValidators,
    updateUserValidators,
    userIdValidators
} = require('../validators/userValidators');

const createUserRouter = ({ authVerify, userController }) => {
    const router = Router();

    router.post('/', [
        allowOnlyFields(['name', 'nickname', 'email', 'password']),
        ...createUserValidators,
        validateForms
    ], userController.createUser);

    router.use(authVerify);

    router.get('/nick', [
        allowOnlyFields(['nick']),
        ...nicknameLookupValidators,
        validateForms
    ], userController.getByNickname);
    router.get('/search/:searchTerm', [
        ...searchUsersValidators,
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

const router = createUserRouter({
    authVerify: defaultAuthVerify,
    userController: defaultUserController
});

module.exports = router;
module.exports.createUserRouter = createUserRouter;
