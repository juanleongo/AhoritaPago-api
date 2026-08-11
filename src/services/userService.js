const bcryptjs = require('bcryptjs');
const userRepository = require('../repositories/user');
const { createUserService } = require('./factories/createUserService');

module.exports = createUserService({
    passwordHasher: bcryptjs,
    userRepository
});
