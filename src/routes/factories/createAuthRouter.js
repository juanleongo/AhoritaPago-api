const { Router } = require('express');
const {
    allowOnlyFields
} = require('../../middlewares/allowOnlyFields');
const { validateForms } = require('../../middlewares/validate-forms');
const { loginValidators } = require('../../validators/authValidators');

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

module.exports = { createAuthRouter };
