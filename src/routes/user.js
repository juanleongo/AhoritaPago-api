const {Router} = require('express')
const { validateForms, authVerify } = require('../middlewares');

const {getAllUsers,getUserById, createUser,updateUser,deleteUser,getByNickname,getUserByToken,searchUsers} = require('../controllers/user')

const router = Router()

// El registro es la única operación pública de usuarios.
router.post('/', createUser)

// Todas las rutas declaradas después de este punto requieren un JWT válido.
router.use(authVerify)

//router.get('/', getAllUsers)
router.get('/nick', getByNickname)
router.get('/:id', [ 
    validateForms
], getUserById)
router.get('/search/:searchTerm', searchUsers);
router.get('/', [ 
    validateForms
], getUserByToken);
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

module.exports= router
