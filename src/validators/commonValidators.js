const { param } = require('express-validator');

const mongoIdParam = (field = 'id') => (
    param(field)
        .isMongoId()
        .withMessage(`El parámetro ${field} debe ser un ObjectId válido.`)
);

module.exports = { mongoIdParam };
