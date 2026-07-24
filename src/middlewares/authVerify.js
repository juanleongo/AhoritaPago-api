const { response } = require('express');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user');

const authVerify = async (req, res= response, next) => {
    const authorization = req.header('Authorization');

    if (!authorization) {
        return res.status(401).json({
            msg: 'Acceso denegado. No se proporcionó un token.'
        });
    }

    const bearerToken = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!bearerToken) {
        return res.status(401).json({
            msg: 'Formato de autorización inválido. Use Bearer <token>.'
        });
    }

    let user;

    try {
        user = jwt.verify(bearerToken[1], process.env.JWT_SECRET);

        if (typeof user !== 'object' || !user.userId) {
            return res.status(401).json({
                msg: 'Token inválido.'
            });
        }
    } catch (err) {
        return res.status(401).json({
            msg: 'Token inválido o expirado.'
        });
    }

    try {
        const activeUser = await userRepository.getActiveUserById(user.userId);

        if (!activeUser) {
            return res.status(401).json({
                msg: 'El usuario no existe o está desactivado.'
            });
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

module.exports = {authVerify};
