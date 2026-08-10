const { body, param } = require('express-validator');
const { mongoIdParam } = require('./commonValidators');

const requiredText = (field, message) => (
    body(field)
        .isString()
        .withMessage(`${message} debe ser texto.`)
        .bail()
        .trim()
        .notEmpty()
        .withMessage(`${message} es obligatorio.`)
);

const optionalText = (field, message) => (
    body(field)
        .optional()
        .isString()
        .withMessage(`${message} debe ser texto.`)
        .bail()
        .trim()
        .notEmpty()
        .withMessage(`${message} no puede estar vacío.`)
);

const userIdValidators = [mongoIdParam()];

const createUserValidators = [
    requiredText('name', 'El nombre'),
    requiredText('nickname', 'El nickname'),
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

const updateUserValidators = [
    mongoIdParam(),
    optionalText('name', 'El nombre'),
    optionalText('nickname', 'El nickname'),
    body('email')
        .optional()
        .isString()
        .withMessage('El correo debe ser texto.')
        .bail()
        .trim()
        .isEmail()
        .withMessage('El correo no tiene un formato válido.')
];

const nicknameLookupValidators = [
    requiredText('nick', 'El nickname')
];

const searchUsersValidators = [
    param('searchTerm')
        .isString()
        .withMessage('El término de búsqueda debe ser texto.')
        .bail()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El término de búsqueda debe tener entre 2 y 50 caracteres.')
];

module.exports = {
    createUserValidators,
    nicknameLookupValidators,
    searchUsersValidators,
    updateUserValidators,
    userIdValidators
};
