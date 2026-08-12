// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// routes/factories/createAuthRouter.js.
const defaultAuthController = require('../controllers/auth');
const { defaultHttpSecurity } = require('../middlewares/httpSecurity');
const { createAuthRouter } = require('./factories/createAuthRouter');

const router = createAuthRouter({
    authController: defaultAuthController,
    loginRateLimiter: defaultHttpSecurity.loginRateLimiter
});

module.exports = router;
module.exports.createAuthRouter = createAuthRouter;
