const { validationResult } = require('express-validator');
const { createHttpError } = require('../helpers/httpError');

const validateForms = ( req, res, next ) => {

    const errors = validationResult(req);
    if( !errors.isEmpty() ){
        const details = errors.array().map(error => ({
            type: error.type,
            path: error.path,
            message: error.msg,
            location: error.location
        }));

        return next(createHttpError(
            400,
            'Los datos enviados no son válidos.',
            'VALIDATION_ERROR',
            details
        ));
    }

    return next();
}


module.exports = {
    validateForms
}
