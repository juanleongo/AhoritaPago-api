const { Router } = require('express');
const { allowOnlyFields, validateForms } = require('../middlewares');
const defaultAuthController = require('../controllers/auth');
const { defaultHttpSecurity } = require('../middlewares/httpSecurity');
const { loginValidators } = require('../validators/authValidators');

const createAuthRouter = ({ authController, loginRateLimiter }) => {
    const router = Router();
    const loginMiddleware = [
        loginRateLimiter,
        allowOnlyFields(['email', 'password']),
        ...loginValidators,
        validateForms
    ].filter(Boolean);

    router.post('/login', loginMiddleware, authController.login);

    return router;
};

const router = createAuthRouter({
    authController: defaultAuthController,
    loginRateLimiter: defaultHttpSecurity.loginRateLimiter
});

module.exports = router;
module.exports.createAuthRouter = createAuthRouter;
