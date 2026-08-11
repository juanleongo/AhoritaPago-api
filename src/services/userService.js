const bcryptjs = require('bcryptjs');
const mongoose = require('mongoose');
const debtRepository = require('../repositories/debt');
const userRepository = require('../repositories/user');
const { createUserService } = require('./factories/createUserService');

module.exports = createUserService({
    debtRepository,
    mongoose,
    passwordHasher: bcryptjs,
    userRepository
});
