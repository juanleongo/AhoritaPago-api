const {Router} = require('express')
const { validateForms, authVerify } = require('../middlewares');

const {getAllUsers,getUserById, createUser,updateUser,deleteUser,getByNickname,getUserByToken,searchUsers} = require('../controllers/user')

const router = Router()

//router.get('/', getAllUsers)
router.get('/nick', getByNickname)
router.get('/:id', [ 
    authVerify,
    validateForms
], getUserById)
router.get('/search/:searchTerm', [
    authVerify // Asegura que solo usuarios logueados puedan buscar
], searchUsers);
router.get('/', [ 
    authVerify,
    validateForms
], getUserByToken);
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

module.exports= router
