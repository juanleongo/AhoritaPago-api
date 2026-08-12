// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// controllers/factories/createDebtController.js.
const debtService = require('../services/debtservice');
const {
    createDebtController
} = require('./factories/createDebtController');

const defaultController = createDebtController({ debtService });

module.exports = {
    ...defaultController,
    createDebtController
};
