const {Router} = require('express')
const { validateForms, authVerify } = require('../middlewares');

const {getAllUsers,getUserById, createUser,updateUser,deleteUser,getByNickname,getUserByToken} = require('../controllers/user')

const router = Router()

//router.get('/', getAllUsers)
router.get('/nick', getByNickname)
router.get('/id', [ 
    authVerify,
    validateForms
], getUserById)
router.get('/', [ 
    authVerify,
    validateForms
], getUserByToken);
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

module.exports= router
