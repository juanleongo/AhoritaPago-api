const User  = require('../models/user')

const getAllUsers = async () => {
    const users = await User.find({ state: true })

    return users
}

const getUserById = async (id, session = null) => {
    const user = await User.findById(id).session(session)
    return user

}
const getUserByToken = async (id) => {
    const user = await User.findById(id)
    return user

}
const getActiveUserById = async (id) => {
    const user = await User.findOne({ _id: id, state: true })
        .select('_id nickname state')
    return user

}
const getUserByEmail = async (email) => {
    const user = await  User.findOne( { email })
    return user

}
const getUserByNickName = async (nickname) => {
    const user = await  User.findOne( { nickname }).select('nickname name')
    return user

}


const createUser = async (userData) => {
    const newUser = await User.create(userData)
    return newUser
}

const updateUser = async (id, updateData, session = null) => {
return await User.findOneAndUpdate(
    { _id: id },
    updateData,
    { new: true, runValidators: true, session }
);
}

const deleteUser = async (id) => {
    const  delUser = await User.findByIdAndUpdate(id,{state : false}, { new: true })

    return delUser
}

const findUsersByNicknameSearch = async (searchTerm) => {

    const regex = new RegExp(searchTerm, 'i');

    const users = await User.find({ nickname: regex }).select('nickname name');
    
    return users;
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserByEmail,
    getUserByNickName,
    getUserByToken,
    getActiveUserById,
    findUsersByNicknameSearch

}
