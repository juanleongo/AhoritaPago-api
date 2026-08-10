const { body } = require('express-validator');

const loginValidators = [
    body('email')
        .isString()
        .withMessage('El correo debe ser texto.')
        .bail()
        .trim()
        .isEmail()
        .withMessage('El correo no tiene un formato válido.'),
    body('password')
        .isString()
        .withMessage('La contraseña debe ser texto.')
        .bail()
        .notEmpty()
        .withMessage('La contraseña es obligatoria.')
];

module.exports = { loginValidators };
