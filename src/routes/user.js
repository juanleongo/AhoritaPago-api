// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// routes/factories/createUserRouter.js.
const defaultUserController = require('../controllers/user');
const { authVerify } = require('../middlewares/authVerify');
const { defaultHttpSecurity } = require('../middlewares/httpSecurity');
const { createUserRouter } = require('./factories/createUserRouter');

const router = createUserRouter({
    authVerify,
    registrationRateLimiter: defaultHttpSecurity.registrationRateLimiter,
    userController: defaultUserController
});

module.exports = router;
module.exports.createUserRouter = createUserRouter;
