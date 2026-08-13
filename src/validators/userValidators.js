const { body, param } = require('express-validator');
const { mongoIdParam } = require('./commonValidators');
const {
    USER_IDENTITY_LIMITS,
    isValidEmail,
    normalizeEmail,
    normalizeName,
    normalizeNickname
} = require('../config/userIdentity');

const lengthMessage = (message, { min, max }) => (
    min === max
        ? `${message} debe tener ${min} caracteres.`
        : `${message} debe tener entre ${min} y ${max} caracteres.`
);

const requiredText = (field, message, normalize, limits) => (
    body(field)
        .isString()
        .withMessage(`${message} debe ser texto.`)
        .bail()
        .customSanitizer(normalize)
        .notEmpty()
        .withMessage(`${message} es obligatorio.`)
        .bail()
        .isLength(limits)
        .withMessage(lengthMessage(message, limits))
);

const optionalText = (field, message, normalize, limits) => (
    body(field)
        .optional()
        .isString()
        .withMessage(`${message} debe ser texto.`)
        .bail()
        .customSanitizer(normalize)
        .notEmpty()
        .withMessage(`${message} no puede estar vacío.`)
        .bail()
        .isLength(limits)
        .withMessage(lengthMessage(message, limits))
);

const emailValidator = ({ optional = false } = {}) => {
    let validator = body('email');

    if (optional) {
        validator = validator.optional();
    }

    return validator
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
        .withMessage('El correo no tiene un formato válido.');
};

const nameLimits = {
    min: USER_IDENTITY_LIMITS.name.minLength,
    max: USER_IDENTITY_LIMITS.name.maxLength
};
const nicknameLimits = {
    min: USER_IDENTITY_LIMITS.nickname.minLength,
    max: USER_IDENTITY_LIMITS.nickname.maxLength
};

const userIdValidators = [mongoIdParam()];

const createUserValidators = [
    requiredText('name', 'El nombre', normalizeName, nameLimits),
    requiredText(
        'nickname',
        'El nickname',
        normalizeNickname,
        nicknameLimits
    ),
    emailValidator(),
    body('password')
        .isString()
        .withMessage('La contraseña debe ser texto.')
        .bail()
        .notEmpty()
        .withMessage('La contraseña es obligatoria.')
        .bail()
        .isLength({ min: USER_IDENTITY_LIMITS.password.minLength })
        .withMessage(
            `La contraseña debe tener al menos ${USER_IDENTITY_LIMITS.password.minLength} caracteres.`
        )
];

const updateUserValidators = [
    mongoIdParam(),
    optionalText('name', 'El nombre', normalizeName, nameLimits),
    optionalText(
        'nickname',
        'El nickname',
        normalizeNickname,
        nicknameLimits
    ),
    emailValidator({ optional: true })
];

const nicknameLookupValidators = [
    requiredText(
        'nick',
        'El nickname',
        normalizeNickname,
        nicknameLimits
    )
];

const nicknameParamValidators = [
    param('nickname')
        .isString()
        .withMessage('El nickname debe ser texto.')
        .bail()
        .customSanitizer(normalizeNickname)
        .isLength(nicknameLimits)
        .withMessage(lengthMessage('El nickname', nicknameLimits))
];

const searchUsersValidators = [
    param('searchTerm')
        .isString()
        .withMessage('El término de búsqueda debe ser texto.')
        .bail()
        .customSanitizer(normalizeNickname)
        .isLength({ min: 2, max: nicknameLimits.max })
        .withMessage(
            `El término de búsqueda debe tener entre 2 y ${nicknameLimits.max} caracteres.`
        )
];

module.exports = {
    createUserValidators,
    nicknameLookupValidators,
    nicknameParamValidators,
    searchUsersValidators,
    updateUserValidators,
    userIdValidators
};
