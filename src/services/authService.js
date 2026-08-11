const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user');
const { createAuthService } = require('./factories/createAuthService');
const {
    getJwtSecretFromEnvironment
} = require('../config/appConfig');

module.exports = createAuthService({
    getJwtSecret: getJwtSecretFromEnvironment,
    passwordHasher: bcrypt,
    tokenProvider: jwt,
    userRepository
});
