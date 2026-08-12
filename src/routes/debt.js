// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// routes/factories/createDebtRouter.js.
const defaultDebtController = require('../controllers/debt');
const { authVerify } = require('../middlewares/authVerify');
const { createDebtRouter } = require('./factories/createDebtRouter');

const router = createDebtRouter({
    authVerify,
    debtController: defaultDebtController
});

module.exports = router;
module.exports.createDebtRouter = createDebtRouter;
