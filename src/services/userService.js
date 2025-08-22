
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

const getByNickname= async (nickname) => {
    const user = await userRepository.getUserByNickName(nickname);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }
    
    return user;
};

const searchUsersByNickname = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
        // Evitamos búsquedas vacías o muy cortas para no sobrecargar la BD.
        throw new Error('El término de búsqueda debe tener al menos 2 caracteres.');
    }

    const users = await userRepository.findUsersByNicknameSearch(searchTerm);
    return users;
};


const getUserByToken= async (token) => {
    const user = await userRepository.getUserByToken(token.userId);
    if (!user) {
        throw new Error('Usuario no encontrado');
    }
    
    return user;
};

const createUser = async (userData) => {
    const { name, email, nickname, password } = userData;

    if (!name || !email || !nickname || !password) {
        throw new Error('El nombre, correo electrónico, nombre de usuario y contraseña son obligatorios');
    }

    const existingEmail = await userRepository.getUserByEmail(email);
    if (existingEmail) {
        throw new Error('El correo electrónico ya está en uso');
    }

    const nicknameUser = await userRepository.getUserByNickName(nickname);
    if (nicknameUser) {
        throw new Error('El nombre de usuario ya está en uso');
    }
    // Encriptar la contraseña
    const salt = bcryptjs.genSaltSync();
    userData.password = bcryptjs.hashSync(password, salt);

    return await userRepository.createUser(userData);
};

const updateUser = async (id,userData) => {
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

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser,getByNickname,getUserByToken, searchUsersByNickname };
