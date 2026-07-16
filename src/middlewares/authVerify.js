const { response } = require('express');
const jwt = require('jsonwebtoken');

const authVerify = (req, res= response, next) => {
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

    try {
        const user = jwt.verify(bearerToken[1], process.env.JWT_SECRET);

        if (typeof user !== 'object' || !user.userId) {
            return res.status(401).json({
                msg: 'Token inválido.'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            msg: 'Token inválido o expirado.'
        });
    }
};

module.exports = {authVerify};
