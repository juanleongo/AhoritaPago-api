
const userRepository = require('../repositories/user');
const bcryptjs = require('bcryptjs');
const { createHttpError } = require('../helpers/httpError');

const isSameUser = (userId, authenticatedUserId) => (
    userId.toString() === authenticatedUserId.toString()
);

const getAllUsers = async () => {
    return await userRepository.getAllUsers();
};

const getUserById = async (id, authenticatedUserId) => {
    if (!isSameUser(id, authenticatedUserId)) {
        throw createHttpError(403, 'No tienes permiso para consultar este usuario');
    }

    const user = await userRepository.getUserById(id);
    if (!user) {
        throw createHttpError(404, 'Usuario no encontrado');
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
    const salt = await bcryptjs.genSalt();
    const hashedPassword = await bcryptjs.hash(password, salt);

    // El registro público solo puede persistir estos cuatro campos.
    // Saldos, estado y otros atributos internos conservan los defaults del modelo.
    const newUserData = {
        name,
        email,
        nickname,
        password: hashedPassword
    };

    return await userRepository.createUser(newUserData);
};

const updateUser = async (id, userData, authenticatedUserId) => {
    if (!isSameUser(id, authenticatedUserId)) {
        throw createHttpError(403, 'No tienes permiso para modificar este usuario');
    }

    const existingUser = await userRepository.getUserById(id);
    if (!existingUser) {
        throw createHttpError(404, 'Usuario no encontrado');
    }

    const allowedFields = ['name', 'nickname', 'email'];
    const allowedData = {};

    allowedFields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(userData, field)) {
            allowedData[field] = userData[field];
        }
    });

    if (Object.keys(allowedData).length === 0) {
        throw createHttpError(400, 'No se enviaron campos permitidos para actualizar');
    }

    return await userRepository.updateUser(id, allowedData);
};

const deleteUser = async (id, authenticatedUserId) => {
    if (!isSameUser(id, authenticatedUserId)) {
        throw createHttpError(403, 'No tienes permiso para eliminar este usuario');
    }

    const existingUser = await userRepository.getUserById(id);
    if (!existingUser) {
        throw createHttpError(404, 'Usuario no encontrado');
    }
    return await userRepository.deleteUser(id);
};

const incrementUserBalances = async (id, balanceChanges, session = null) => {
    const existingUser = await userRepository.getUserById(id, session);
    if (!existingUser) {
        throw createHttpError(404, 'Usuario no encontrado');
    }

    const allowedBalances = ['owe', 'owes'];
    const safeChanges = {};

    allowedBalances.forEach(field => {
        if (Number.isFinite(balanceChanges[field])) {
            safeChanges[field] = balanceChanges[field];
        }
    });

    if (Object.keys(safeChanges).length === 0) {
        throw createHttpError(400, 'No se enviaron cambios de saldo válidos');
    }

    return await userRepository.updateUser(id, { $inc: safeChanges }, session);
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser,getByNickname,getUserByToken, searchUsersByNickname, incrementUserBalances };
