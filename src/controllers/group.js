// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// controllers/factories/createGroupController.js.
const groupService = require('../services/groupService');
const {
    createGroupController
} = require('./factories/createGroupController');

const defaultController = createGroupController({ groupService });

module.exports = {
    ...defaultController,
    createGroupController
};
