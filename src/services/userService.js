const User = require('../models/user');
const userRepository = require('../repositories/user');
const bcryptjs = require('bcryptjs');

const getAllUsers = async () => {
    return await userRepository.getAllUsers();
};

const getUserById = async (id) => {
    const user = await userRepository.getUserById(id);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }
    return user;
};

const createUser = async (userData) => {
    if (!userData.name || !userData.email) {
        throw new Error('El nombre y el correo electrónico son obligatorios');
    }
    const password = userData.password

    // Encriptar la contraseña
    const salt = bcryptjs.genSaltSync();
    userData.password = bcryptjs.hashSync( password, salt );
    return await userRepository.createUser(userData);
};

const updateUser = async (id, userData) => {
    const existingUser = await userRepository.getUserById(id);
    if (!existingUser) {
        throw new Error('Usuario no encontrado');
    }
    const updatedUser = await userRepository.updateUser(id,userData);
    return updatedUser;
};

const deleteUser = async (id) => {
    const existingUser = await userRepository.getUserById(id);
    if (!existingUser) {
        throw new Error('Usuario no encontrado');
    }
    return await userRepository.deleteUser(id);
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
