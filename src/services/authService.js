const userRepository = require('../repositories/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createHttpError } = require('../helpers/httpError');

const login = async (email, password) => {
    const user = await userRepository.getUserByEmail(email);
    if (!user) {
        throw createHttpError(
            401,
            'Credenciales incorrectas',
            'INVALID_CREDENTIALS'
        );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw createHttpError(
            401,
            'Credenciales incorrectas',
            'INVALID_CREDENTIALS'
        );
    }
    if ( !user.state) {
        throw createHttpError(
            401,
            'Usuario suspendido',
            'USER_INACTIVE'
        );
    }

    const token = jwt.sign({ userId: user._id, nick: user.nickname }, process.env.JWT_SECRET, { expiresIn: '4h' });
    return token;
};

module.exports = { login };
