const {getAllUsers,getUserById,createUser,updateUser,deleteUser} = require ('../repositories/user')

const getAllUsers = async () => {
    const users = await  getAllUsers()

    return users
    
}

const getUserById = async (id) => {
  
}

const createUser = async (userData) => {
    
}

const updateUser = async (id,userData) => {

    if (userData)  {
        throw new Error('User not found')

    }
    const user = await updateUser(id,userData)
}

const deleteUser = async (id,userData) => {
    
}

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser

}