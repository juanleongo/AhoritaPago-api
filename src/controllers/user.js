// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// controllers/factories/createUserController.js.
const userService = require('../services/userService');
const {
    createUserController
} = require('./factories/createUserController');

const defaultController = createUserController({ userService });

module.exports = {
    ...defaultController,
    createUserController
};
