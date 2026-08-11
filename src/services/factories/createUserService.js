const { createHttpError } = require('../../helpers/httpError');

const isSameUser = (userId, authenticatedUserId) => (
    userId.toString() === authenticatedUserId.toString()
);

const createUserService = ({ userRepository, passwordHasher }) => {
    const getAllUsers = async () => userRepository.findAllActive();

    const getUserById = async (id, authenticatedUserId) => {
        if (!isSameUser(id, authenticatedUserId)) {
            throw createHttpError(
                403,
                'No tienes permiso para consultar este usuario',
                'USER_ACCESS_FORBIDDEN'
            );
        }

        const user = await userRepository.findActiveById(id);
        if (!user) {
            throw createHttpError(
                404,
                'Usuario no encontrado',
                'USER_NOT_FOUND'
            );
        }

        return user;
    };

    const getByNickname = async nickname => {
        const user = await userRepository.findActiveByNickname(nickname);
        if (!user) {
            throw createHttpError(
                404,
                'Usuario no encontrado',
                'USER_NOT_FOUND'
            );
        }

        return user;
    };

    const searchUsersByNickname = async searchTerm => {
        if (!searchTerm || searchTerm.trim().length < 2) {
            throw createHttpError(
                400,
                'El término de búsqueda debe tener al menos 2 caracteres.',
                'SEARCH_TERM_TOO_SHORT'
            );
        }

        return userRepository.searchActiveByNickname(searchTerm);
    };

    const getUserByToken = async token => {
        const user = await userRepository.findActiveById(token.userId);
        if (!user) {
            throw createHttpError(
                404,
                'Usuario no encontrado',
                'USER_NOT_FOUND'
            );
        }

        return user;
    };

    const createUser = async userData => {
        const { name, email, nickname, password } = userData;

        if (!name || !email || !nickname || !password) {
            throw createHttpError(
                400,
                'El nombre, correo electrónico, nombre de usuario y contraseña son obligatorios',
                'USER_REQUIRED_FIELDS_MISSING'
            );
        }

        const existingEmail = await userRepository.findByEmail(email);
        if (existingEmail) {
            throw createHttpError(
                409,
                'El correo electrónico ya está en uso',
                'EMAIL_ALREADY_IN_USE'
            );
        }

        const nicknameUser = await userRepository.findByNickname(nickname);
        if (nicknameUser) {
            throw createHttpError(
                409,
                'El nombre de usuario ya está en uso',
                'NICKNAME_ALREADY_IN_USE'
            );
        }

        const salt = await passwordHasher.genSalt();
        const hashedPassword = await passwordHasher.hash(password, salt);

        return userRepository.create({
            name,
            email,
            nickname,
            password: hashedPassword
        });
    };

    const updateUser = async (id, userData, authenticatedUserId) => {
        if (!isSameUser(id, authenticatedUserId)) {
            throw createHttpError(
                403,
                'No tienes permiso para modificar este usuario',
                'USER_UPDATE_FORBIDDEN'
            );
        }

        const existingUser = await userRepository.findActiveById(id);
        if (!existingUser) {
            throw createHttpError(
                404,
                'Usuario no encontrado',
                'USER_NOT_FOUND'
            );
        }

        const allowedData = {};
        ['name', 'nickname', 'email'].forEach(field => {
            if (Object.prototype.hasOwnProperty.call(userData, field)) {
                allowedData[field] = userData[field];
            }
        });

        if (Object.keys(allowedData).length === 0) {
            throw createHttpError(
                400,
                'No se enviaron campos permitidos para actualizar',
                'USER_UPDATE_FIELDS_INVALID'
            );
        }

        return userRepository.updateById(id, allowedData);
    };

    const deleteUser = async (id, authenticatedUserId) => {
        if (!isSameUser(id, authenticatedUserId)) {
            throw createHttpError(
                403,
                'No tienes permiso para eliminar este usuario',
                'USER_DELETE_FORBIDDEN'
            );
        }

        const existingUser = await userRepository.findActiveById(id);
        if (!existingUser) {
            throw createHttpError(
                404,
                'Usuario no encontrado',
                'USER_NOT_FOUND'
            );
        }

        return userRepository.deactivateById(id);
    };

    const incrementUserBalances = async (
        id,
        balanceChanges,
        session = null
    ) => {
        const existingUser = await userRepository.findActiveById(
            id,
            { session }
        );
        if (!existingUser) {
            throw createHttpError(
                404,
                'Usuario no encontrado',
                'USER_NOT_FOUND'
            );
        }

        const safeChanges = {};
        ['owe', 'owes'].forEach(field => {
            if (Number.isFinite(balanceChanges[field])) {
                safeChanges[field] = balanceChanges[field];
            }
        });

        if (Object.keys(safeChanges).length === 0) {
            throw createHttpError(
                400,
                'No se enviaron cambios de saldo válidos',
                'BALANCE_CHANGES_INVALID'
            );
        }

        return userRepository.updateById(
            id,
            { $inc: safeChanges },
            { session }
        );
    };

    return {
        createUser,
        deleteUser,
        getAllUsers,
        getByNickname,
        getUserById,
        getUserByToken,
        incrementUserBalances,
        searchUsersByNickname,
        updateUser
    };
};

module.exports = { createUserService };
