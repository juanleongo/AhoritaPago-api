const userRepository = require('../repositories/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (email, password) => {
    const user = await userRepository.getUserByEmail(email);
    if (!user) {
        throw new Error('Email incorrecto');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Contraseña incorrecta');
    }
    if ( !user.state) {
        throw new Error('Usuario suspendido');
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '4h' });

    return token;
};

module.exports = { login };
