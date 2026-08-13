const { body } = require('express-validator');
const {
    USER_IDENTITY_LIMITS,
    isValidEmail,
    normalizeEmail
} = require('../config/userIdentity');

const loginValidators = [
    body('email')
        .isString()
        .withMessage('El correo debe ser texto.')
        .bail()
        .customSanitizer(normalizeEmail)
        .notEmpty()
        .withMessage('El correo es obligatorio.')
        .bail()
        .isLength({ max: USER_IDENTITY_LIMITS.email.maxLength })
        .withMessage(
            `El correo no puede superar ${USER_IDENTITY_LIMITS.email.maxLength} caracteres.`
        )
        .bail()
        .custom(isValidEmail)
        .withMessage('El correo no tiene un formato válido.'),
    body('password')
        .isString()
        .withMessage('La contraseña debe ser texto.')
        .bail()
        .notEmpty()
        .withMessage('La contraseña es obligatoria.')
];

module.exports = { loginValidators };
