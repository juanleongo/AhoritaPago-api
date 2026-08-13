const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { check } = require('express-validator');
const { createHttpError } = require('../../src/helpers/httpError');
const { asyncHandler } = require('../../src/middlewares/asyncHandler');
const {
    errorHandler,
    normalizeError,
    notFoundHandler
} = require('../../src/middlewares/errorHandler');
const { validateForms } = require('../../src/middlewares/validate-forms');

const createResponse = () => {
    const result = {
        statusCode: null,
        body: null
    };

    return {
        result,
        response: {
            headersSent: false,
            status(statusCode) {
                result.statusCode = statusCode;
                return this;
            },
            json(body) {
                result.body = body;
                return this;
            }
        }
    };
};

const executeErrorHandler = (error) => {
    const { result, response } = createResponse();
    errorHandler(error, {}, response, () => {});
    return result;
};

describe('manejo centralizado de errores', () => {
    it('identifica el campo de una colisión única concurrente', () => {
        const emailError = normalizeError({
            code: 11000,
            keyPattern: { email: 1 }
        });
        const nicknameError = normalizeError({
            code: 11000,
            keyValue: { nickname: 'LEON' }
        });

        assert.equal(emailError.statusCode, 409);
        assert.equal(emailError.errorCode, 'EMAIL_ALREADY_IN_USE');
        assert.equal(nicknameError.statusCode, 409);
        assert.equal(
            nicknameError.errorCode,
            'NICKNAME_ALREADY_IN_USE'
        );
    });

    it('devuelve el contrato uniforme para errores de negocio', () => {
        const result = executeErrorHandler(createHttpError(
            404,
            'Grupo no encontrado',
            'GROUP_NOT_FOUND'
        ));

        assert.equal(result.statusCode, 404);
        assert.deepEqual(result.body, {
            success: false,
            error: {
                code: 'GROUP_NOT_FOUND',
                message: 'Grupo no encontrado'
            }
        });
    });

    it('oculta el mensaje técnico de errores internos', () => {
        const originalConsoleError = console.error;
        let loggedError;
        console.error = error => {
            loggedError = error;
        };

        try {
            const internalError = new Error(
                'MongoServerError: contraseña=secreto'
            );
            const result = executeErrorHandler(internalError);

            assert.equal(result.statusCode, 500);
            assert.deepEqual(result.body, {
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Ocurrió un error interno.'
                }
            });
            assert.equal(loggedError, internalError);
        } finally {
            console.error = originalConsoleError;
        }
    });

    it('también oculta mensajes sensibles de errores HTTP 500', () => {
        const originalConsoleError = console.error;
        console.error = () => {};

        try {
            const result = executeErrorHandler(createHttpError(
                500,
                'Falló la conexión mongodb://usuario:secreto@servidor',
                'DATABASE_ERROR',
                [{ connection: 'secreta' }]
            ));

            assert.deepEqual(result.body, {
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Ocurrió un error interno.'
                }
            });
        } finally {
            console.error = originalConsoleError;
        }
    });

    it('normaliza identificadores inválidos de Mongoose', () => {
        const castError = new Error('Cast to ObjectId failed');
        castError.name = 'CastError';

        const result = executeErrorHandler(castError);

        assert.equal(result.statusCode, 400);
        assert.equal(result.body.error.code, 'INVALID_ID');
    });

    it('clasifica el JSON mal formado como un error del cliente', () => {
        const parseError = new SyntaxError('Unexpected token');
        parseError.status = 400;
        parseError.type = 'entity.parse.failed';

        const result = executeErrorHandler(parseError);

        assert.equal(result.statusCode, 400);
        assert.deepEqual(result.body.error, {
            code: 'INVALID_JSON',
            message: 'El cuerpo de la solicitud no contiene un JSON válido.'
        });
    });

    it('convierte rutas inexistentes en errores JSON', () => {
        let routeError;
        notFoundHandler({}, {}, error => {
            routeError = error;
        });

        const result = executeErrorHandler(routeError);

        assert.equal(result.statusCode, 404);
        assert.equal(result.body.error.code, 'ROUTE_NOT_FOUND');
    });

    it('propaga rechazos asíncronos al manejador de errores', async () => {
        const expectedError = createHttpError(
            403,
            'Acceso denegado',
            'ACCESS_DENIED'
        );
        const handler = asyncHandler(async () => {
            throw expectedError;
        });
        let propagatedError;

        await handler({}, {}, error => {
            propagatedError = error;
        });

        assert.equal(propagatedError, expectedError);
    });

    it('entrega detalles de validación sin devolver el valor recibido', async () => {
        const req = {
            body: {
                password: 'contraseña-secreta'
            }
        };
        await check('password', 'La contraseña es demasiado corta')
            .isLength({ min: 30 })
            .run(req);
        let validationError;

        validateForms(req, {}, error => {
            validationError = error;
        });

        const result = executeErrorHandler(validationError);

        assert.equal(result.statusCode, 400);
        assert.equal(result.body.error.code, 'VALIDATION_ERROR');
        assert.deepEqual(result.body.error.details, [{
            type: 'field',
            path: 'password',
            message: 'La contraseña es demasiado corta',
            location: 'body'
        }]);
        assert.equal(
            JSON.stringify(result.body).includes('contraseña-secreta'),
            false
        );
    });
});
