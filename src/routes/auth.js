const { Router } = require('express');
const { allowOnlyFields, validateForms } = require('../middlewares');
const defaultAuthController = require('../controllers/auth');
const { loginValidators } = require('../validators/authValidators');

const createAuthRouter = ({ authController }) => {
    const router = Router();

    router.post('/login', [
        allowOnlyFields(['email', 'password']),
        ...loginValidators,
        validateForms
    ], authController.login);

    return router;
};

const router = createAuthRouter({
    authController: defaultAuthController
});

module.exports = router;
module.exports.createAuthRouter = createAuthRouter;
