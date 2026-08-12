// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// routes/factories/createGroupRouter.js.
const defaultGroupController = require('../controllers/group');
const { authVerify } = require('../middlewares/authVerify');
const { createGroupRouter } = require('./factories/createGroupRouter');

const router = createGroupRouter({
    authVerify,
    groupController: defaultGroupController
});

module.exports = router;
module.exports.createGroupRouter = createGroupRouter;
