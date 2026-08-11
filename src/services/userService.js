const bcryptjs = require('bcryptjs');
const debtRepository = require('../repositories/debt');
const userRepository = require('../repositories/user');
const { createUserService } = require('./factories/createUserService');
const {
    createMongooseTransactionManager
} = require('../adapters/mongooseTransactionManager');

const transactionManager = createMongooseTransactionManager();

module.exports = createUserService({
    debtRepository,
    passwordHasher: bcryptjs,
    transactionManager,
    userRepository
});
