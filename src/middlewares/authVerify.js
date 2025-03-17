const { response, request } = require('express');
const jwt = require('jsonwebtoken');

const authVerify = (req, res= response, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            msg: 'Acceso denegado. No se proporcionó un token.'
        });
    }


    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ 
            msg: 'Token inválido.' 
        });
    }
};

module.exports = {authVerify};