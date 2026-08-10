const {Router} = require('express')
const {
    allowOnlyFields,
    authVerify,
    validateForms
} = require('../middlewares');
const {
    createUserValidators,
    nicknameLookupValidators,
    searchUsersValidators,
    updateUserValidators,
    userIdValidators
} = require('../validators/userValidators');

const {getAllUsers,getUserById, createUser,updateUser,deleteUser,getByNickname,getUserByToken,searchUsers} = require('../controllers/user')

const router = Router()

// El registro es la única operación pública de usuarios.
router.post('/', [
    allowOnlyFields(['name', 'nickname', 'email', 'password']),
    ...createUserValidators,
    validateForms
], createUser)

// Todas las rutas declaradas después de este punto requieren un JWT válido.
router.use(authVerify)

//router.get('/', getAllUsers)
router.get('/nick', [
    allowOnlyFields(['nick']),
    ...nicknameLookupValidators,
    validateForms
], getByNickname)
router.get('/search/:searchTerm', [
    ...searchUsersValidators,
    validateForms
], searchUsers);
router.get('/:id', [
    ...userIdValidators,
    validateForms
], getUserById)
router.get('/', getUserByToken);
router.put('/:id', [
    allowOnlyFields(['name', 'nickname', 'email']),
    ...updateUserValidators,
    validateForms
], updateUser)
router.delete('/:id', [
    allowOnlyFields([]),
    ...userIdValidators,
    validateForms
], deleteUser)

module.exports= router
