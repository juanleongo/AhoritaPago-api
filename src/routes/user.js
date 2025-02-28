const {Router} = require('express')

const {getAllUsers,getUserById, createUser,updateUser,deleteUser} = require('../controllers/user')

const router = Router()

router.get('/', getAllUsers)
router.get('/:id', getUserById)
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

module.exports= router
