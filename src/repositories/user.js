const User  = require('../models/user')

const getAllUsers = async () => {
    const users = await User.findAll()

    return users
}

const getUserById = async (id) => {
    const user = await User.findById(id)
    return user

}
const getUserByEmail = async (email) => {
    const user = await  User.findOne( { email })
    return user

}
const getUserByNickName = async (nickname) => {
    const user = await  User.findOne( { nickname })
    return user

}


const createUser = async (userData) => {
    const newUser = await User.create(userData)
    return newUser
}

const updateUser = async (id,userData) => {
    const updateUser = await User.findAndUpdate(id,userData)

    return updateUser
}

const deleteUser = async (id) => {
    const  delUser = await Usuario.findByIdAndUpdate(id,{state : false})

    return delUser
}

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserByEmail,
    getUserByNickName

}