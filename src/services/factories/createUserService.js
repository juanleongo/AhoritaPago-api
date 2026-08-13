const { createHttpError } = require('../../helpers/httpError');
const { PAGINATION } = require('../../config/pagination');
const { createPaginationMetadata } = require('../../helpers/pagination');
const {
    USER_IDENTITY_LIMITS,
    hasIdentityLength,
    isValidEmail,
    normalizeEmail,
    normalizeName,
    normalizeNickname
} = require('../../config/userIdentity');

const isSameUser = (userId, authenticatedUserId) => (
    userId.toString() === authenticatedUserId.toString()
);

const validateIdentityData = (userData, { includePassword = false } = {}) => {
    const issues = [];

    if (
        Object.prototype.hasOwnProperty.call(userData, 'name')
        && !hasIdentityLength(userData.name, USER_IDENTITY_LIMITS.name)
    ) {
        issues.push({ path: 'name', message: 'El nombre no tiene una longitud válida.' });
    }
    if (
        Object.prototype.hasOwnProperty.call(userData, 'nickname')
        && !hasIdentityLength(userData.nickname, USER_IDENTITY_LIMITS.nickname)
    ) {
        issues.push({
            path: 'nickname',
            message: 'El nickname no tiene una longitud válida.'
        });
    }
    if (
        Object.prototype.hasOwnProperty.call(userData, 'email')
        && (
            !hasIdentityLength(userData.email, USER_IDENTITY_LIMITS.email)
            || !isValidEmail(userData.email)
        )
    ) {
        issues.push({ path: 'email', message: 'El correo no es válido.' });
    }
    if (
        includePassword
        && !hasIdentityLength(userData.password, USER_IDENTITY_LIMITS.password)
    ) {
        issues.push({
            path: 'password',
            message: `La contraseña debe tener al menos ${USER_IDENTITY_LIMITS.password.minLength} caracteres.`
        });
    }

    if (issues.length > 0) {
        throw createHttpError(
            400,
            'Los datos de identidad no son válidos.',
            'USER_IDENTITY_INVALID',
            issues
        );
    }
};

const createUserService = ({
    balanceService,
    debtRepository,
    passwordHasher,
    transactionManager,
    userRepository
}) => {
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

        return balanceService.withActiveBalance(user);
    };

    const getByNickname = async nickname => {
        const normalizedNickname = normalizeNickname(nickname);
        const user = await userRepository.findActiveByNickname(
            normalizedNickname
        );
        if (!user) {
            throw createHttpError(
                404,
                'Usuario no encontrado',
                'USER_NOT_FOUND'
            );
        }

        return user;
    };

    const searchUsersByNickname = async (searchTerm, pagination = {}) => {
        const normalizedSearchTerm = normalizeNickname(searchTerm);

        if (!normalizedSearchTerm || normalizedSearchTerm.length < 2) {
            throw createHttpError(
                400,
                'El término de búsqueda debe tener al menos 2 caracteres.',
                'SEARCH_TERM_TOO_SHORT'
            );
        }

        const page = pagination.page ?? PAGINATION.defaultPage;
        const limit = pagination.limit ?? PAGINATION.defaultLimit;
        const [results, count] = await Promise.all([
            userRepository.searchActiveByNickname(
                normalizedSearchTerm,
                { page, limit }
            ),
            userRepository.countActiveByNickname(normalizedSearchTerm)
        ]);

        return {
            count,
            pagination: createPaginationMetadata(count, page, limit),
            results
        };
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

        return balanceService.withActiveBalance(user);
    };

    const createUser = async userData => {
        const normalizedUserData = {
            name: normalizeName(userData.name),
            email: normalizeEmail(userData.email),
            nickname: normalizeNickname(userData.nickname),
            password: userData.password
        };
        const { name, email, nickname, password } = normalizedUserData;

        if (!name || !email || !nickname || !password) {
            throw createHttpError(
                400,
                'El nombre, correo electrónico, nombre de usuario y contraseña son obligatorios',
                'USER_REQUIRED_FIELDS_MISSING'
            );
        }
        validateIdentityData(normalizedUserData, { includePassword: true });

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

        const createdUser = await userRepository.create({
            name,
            email,
            nickname,
            password: hashedPassword
        });

        return balanceService.withActiveBalance(createdUser);
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
                const normalizers = {
                    email: normalizeEmail,
                    name: normalizeName,
                    nickname: normalizeNickname
                };
                allowedData[field] = normalizers[field](userData[field]);
            }
        });

        if (Object.keys(allowedData).length === 0) {
            throw createHttpError(
                400,
                'No se enviaron campos permitidos para actualizar',
                'USER_UPDATE_FIELDS_INVALID'
            );
        }
        validateIdentityData(allowedData);

        if (
            Object.prototype.hasOwnProperty.call(allowedData, 'email')
            && allowedData.email !== existingUser.email
        ) {
            const emailUser = await userRepository.findByEmail(
                allowedData.email
            );
            if (emailUser && !isSameUser(emailUser._id, id)) {
                throw createHttpError(
                    409,
                    'El correo electrónico ya está en uso',
                    'EMAIL_ALREADY_IN_USE'
                );
            }
        }

        if (
            Object.prototype.hasOwnProperty.call(allowedData, 'nickname')
            && allowedData.nickname !== existingUser.nickname
        ) {
            const nicknameUser = await userRepository.findByNickname(
                allowedData.nickname
            );
            if (nicknameUser && !isSameUser(nicknameUser._id, id)) {
                throw createHttpError(
                    409,
                    'El nombre de usuario ya está en uso',
                    'NICKNAME_ALREADY_IN_USE'
                );
            }
        }

        const updatedUser = await userRepository.updateById(id, allowedData);

        return balanceService.withActiveBalance(updatedUser);
    };

    const deleteUser = async (id, authenticatedUserId) => {
        if (!isSameUser(id, authenticatedUserId)) {
            throw createHttpError(
                403,
                'No tienes permiso para eliminar este usuario',
                'USER_DELETE_FORBIDDEN'
            );
        }

        return transactionManager.runInTransaction(async transaction => {
            const existingUser = await userRepository.findActiveById(
                id,
                { transaction }
            );
            if (!existingUser) {
                throw createHttpError(
                    404,
                    'Usuario no encontrado',
                    'USER_NOT_FOUND'
                );
            }

            const hasActiveDebts = (
                await debtRepository.existsActiveByParticipant(
                    id,
                    { transaction }
                )
            );
            if (hasActiveDebts) {
                throw createHttpError(
                    409,
                    'No puedes desactivar tu cuenta mientras tengas deudas activas.',
                    'USER_HAS_ACTIVE_DEBTS'
                );
            }

            return userRepository.deactivateById(id, { transaction });
        });
    };

    return {
        createUser,
        deleteUser,
        getByNickname,
        getUserById,
        getUserByToken,
        searchUsersByNickname,
        updateUser
    };
};

module.exports = { createUserService };
