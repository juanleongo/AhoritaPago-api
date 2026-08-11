// Fachada de compatibilidad para consumidores que todavía importan este
// módulo directamente. La aplicación en ejecución usa compositionRoot.js.
const debtRepository = require('../repositories/debt');
const groupRepository = require('../repositories/group');
const userService = require('./userService');
const { createDebtService } = require('./debt/createDebtService');
const {
    createMongooseTransactionManager
} = require('../adapters/mongooseTransactionManager');

const transactionManager = createMongooseTransactionManager();

module.exports = createDebtService({
    debtRepository,
    groupRepository,
    transactionManager,
    userService
});
