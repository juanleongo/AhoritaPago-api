const { Router } = require('express');
const { allowOnlyFields, validateForms } = require('../middlewares');
const { login } = require('../controllers/auth');
const { loginValidators } = require('../validators/authValidators');

const router = Router();

router.post('/login', [
    allowOnlyFields(['email', 'password']),
    ...loginValidators,
    validateForms
], login);

//router.post('/google',[
 //   check('id_token', 'El id_token es necesario').not().isEmpty(),
 //   validarCampos
//], googleSignin );



module.exports = router;
