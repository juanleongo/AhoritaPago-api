const { body, param } = require('express-validator');
const { mongoIdParam } = require('./commonValidators');

const groupIdValidators = [mongoIdParam()];

const createGroupValidators = [
    body('name')
        .isString()
        .withMessage('El nombre del grupo debe ser texto.')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('El nombre del grupo es obligatorio.')
];

const updateGroupValidators = [
    mongoIdParam(),
    body('name')
        .isString()
        .withMessage('El nombre del grupo debe ser texto.')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('El nombre del grupo es obligatorio.')
];

const addGroupMemberValidators = [
    body('groupCode')
        .isString()
        .withMessage('El código del grupo debe ser texto.')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('El código del grupo es obligatorio.'),
    body('userNick')
        .isString()
        .withMessage('El nickname del usuario debe ser texto.')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('El nickname del usuario es obligatorio.')
];

const groupCodeValidators = [
    param('groupCode')
        .isString()
        .withMessage('El código del grupo debe ser texto.')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('El código del grupo es obligatorio.')
];

module.exports = {
    addGroupMemberValidators,
    createGroupValidators,
    groupCodeValidators,
    groupIdValidators,
    updateGroupValidators
};
