const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user');
const { createHttpError } = require('../helpers/httpError');

const authVerify = async (req, res, next) => {
    const authorization = req.header('Authorization');

    if (!authorization) {
        return next(createHttpError(
            401,
            'Acceso denegado. No se proporcionó un token.',
            'TOKEN_MISSING'
        ));
    }

    const bearerToken = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!bearerToken) {
        return next(createHttpError(
            401,
            'Formato de autorización inválido. Use Bearer <token>.',
            'TOKEN_FORMAT_INVALID'
        ));
    }

    let user;

    try {
        user = jwt.verify(bearerToken[1], process.env.JWT_SECRET);
    } catch (error) {
        return next(createHttpError(
            401,
            'Token inválido o expirado.',
            'TOKEN_INVALID_OR_EXPIRED'
        ));
    }

    if (typeof user !== 'object' || !user.userId) {
        return next(createHttpError(
            401,
            'Token inválido.',
            'TOKEN_INVALID'
        ));
    }

    try {
        const activeUser = await userRepository.getActiveUserById(user.userId);

        if (!activeUser) {
            return next(createHttpError(
                401,
                'El usuario no existe o está desactivado.',
                'TOKEN_USER_INACTIVE'
            ));
        }

        req.user = {
            ...user,
            nick: activeUser.nickname || user.nick
        };

        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = { authVerify };
