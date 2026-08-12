// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// middlewares/factories/createAuthVerify.js.
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user');
const {
    getJwtSecretFromEnvironment
} = require('../config/appConfig');
const {
    createAuthVerify
} = require('./factories/createAuthVerify');

const authVerify = createAuthVerify({
    getJwtSecret: getJwtSecretFromEnvironment,
    tokenProvider: jwt,
    userRepository
});

module.exports = { authVerify, createAuthVerify };
