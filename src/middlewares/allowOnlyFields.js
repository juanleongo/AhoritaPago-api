const { createHttpError } = require('../helpers/httpError');

const allowOnlyFields = (allowedFields, location = 'body') => (
    function allowedFieldsMiddleware(req, res, next) {
        const requestData = req[location] || {};
        const unknownFields = Object.keys(requestData).filter(
            field => !allowedFields.includes(field)
        );

        if (unknownFields.length > 0) {
            return next(createHttpError(
                400,
                'La solicitud contiene campos no permitidos.',
                'UNKNOWN_FIELDS',
                unknownFields.map(path => ({ path, location }))
            ));
        }

        return next();
    }
);

module.exports = { allowOnlyFields };
