const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user');
const { createAuthService } = require('./factories/createAuthService');

module.exports = createAuthService({
    getJwtSecret: () => process.env.JWT_SECRET,
    passwordHasher: bcrypt,
    tokenProvider: jwt,
    userRepository
});
