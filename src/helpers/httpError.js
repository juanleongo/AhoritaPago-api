const defaultCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE'
};

class HttpError extends Error {
    constructor(statusCode, message, errorCode, details) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.errorCode = errorCode || defaultCodes[statusCode] || 'HTTP_ERROR';

        if (details !== undefined) {
            this.details = details;
        }
    }
}

const createHttpError = (statusCode, message, errorCode, details) => (
    new HttpError(statusCode, message, errorCode, details)
);

module.exports = { HttpError, createHttpError };
