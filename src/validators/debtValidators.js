const { body } = require('express-validator');
const { mongoIdParam } = require('./commonValidators');

const debtIdValidators = [mongoIdParam()];

const createDebtValidators = [
    body('description')
        .isString()
        .withMessage('La descripción debe ser texto.')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('La descripción es obligatoria.'),
    body('value')
        .notEmpty()
        .withMessage('El valor de la deuda es obligatorio.')
        .bail()
        .isFloat({ gt: 0 })
        .withMessage('El valor de la deuda debe ser mayor que cero.')
        .toFloat(),
    body('group')
        .isMongoId()
        .withMessage('El grupo debe ser un ObjectId válido.'),
    body('debtor')
        .isArray({ min: 1 })
        .withMessage('La lista de deudores debe contener al menos un usuario.'),
    body('debtor.*')
        .isMongoId()
        .withMessage('Cada deudor debe ser un ObjectId válido.')
];

const updateDebtValidators = [
    mongoIdParam(),
    body('description')
        .isString()
        .withMessage('La descripción debe ser texto.')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('La descripción es obligatoria.')
];

module.exports = {
    createDebtValidators,
    debtIdValidators,
    updateDebtValidators
};
