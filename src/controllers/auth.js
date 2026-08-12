// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// controllers/factories/createAuthController.js.
const authService = require('../services/authService');
const {
    createAuthController
} = require('./factories/createAuthController');

const defaultController = createAuthController({ authService });

module.exports = {
    ...defaultController,
    createAuthController
};
