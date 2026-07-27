const { createHttpError } = require('../helpers/httpError');

const normalizeError = (error) => {
    if (error?.type === 'entity.parse.failed') {
        return createHttpError(
            400,
            'El cuerpo de la solicitud no contiene un JSON válido.',
            'INVALID_JSON'
        );
    }

    if (error?.type === 'entity.too.large') {
        return createHttpError(
            413,
            'El cuerpo de la solicitud supera el tamaño permitido.',
            'PAYLOAD_TOO_LARGE'
        );
    }

    const clientStatus = error?.statusCode || error?.status;
    const hasSafeClientStatus = (
        Number.isInteger(clientStatus)
        && clientStatus >= 400
        && clientStatus < 500
    );

    if (hasSafeClientStatus) {
        return createHttpError(
            clientStatus,
            error.message,
            error.errorCode,
            error.details
        );
    }

    if (error?.name === 'CastError') {
        return createHttpError(
            400,
            'El identificador enviado no es válido.',
            'INVALID_ID'
        );
    }

    if (error?.name === 'ValidationError') {
        const details = Object.values(error.errors || {}).map(item => ({
            path: item.path,
            message: item.message
        }));

        return createHttpError(
            400,
            'Los datos enviados no son válidos.',
            'DATABASE_VALIDATION_ERROR',
            details
        );
    }

    if (error?.code === 11000) {
        return createHttpError(
            409,
            'Ya existe un registro con esos datos.',
            'DUPLICATE_RESOURCE'
        );
    }

    return createHttpError(
        500,
        'Ocurrió un error interno.',
        'INTERNAL_SERVER_ERROR'
    );
};

const notFoundHandler = (req, res, next) => {
    next(createHttpError(
        404,
        'La ruta solicitada no existe.',
        'ROUTE_NOT_FOUND'
    ));
};

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const normalizedError = normalizeError(error);

    if (normalizedError.statusCode >= 500) {
        console.error(error);
    }

    const responseError = {
        code: normalizedError.errorCode,
        message: normalizedError.message
    };

    if (normalizedError.details !== undefined) {
        responseError.details = normalizedError.details;
    }

    return res.status(normalizedError.statusCode).json({
        success: false,
        error: responseError
    });
};

module.exports = {
    errorHandler,
    normalizeError,
    notFoundHandler
};
