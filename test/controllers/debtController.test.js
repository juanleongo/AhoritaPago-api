const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const debtService = require('../../src/services/debtservice');
const { getDebtHistory } = require('../../src/controllers/debt');
const { errorHandler } = require('../../src/middlewares/errorHandler');

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

describe('debtController: historial', () => {
    it('devuelve conteos y listas separadas en formato JSON', async () => {
        const originalMethod = debtService.getDebtHistoryForUser;
        debtService.getDebtHistoryForUser = async (userId, pagination) => {
            assert.equal(userId, 'user-1');
            assert.deepEqual(pagination, {
                activePage: 2,
                paidPage: 1,
                limit: 5
            });
            return {
                count: { total: 3, active: 1, paid: 2 },
                pagination: {
                    active: {
                        page: 2,
                        limit: 5,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPreviousPage: true
                    },
                    paid: {
                        page: 1,
                        limit: 5,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                },
                active: [{ id: 'active-1' }],
                paid: [{ id: 'paid-1' }, { id: 'paid-2' }]
            };
        };

        const { result, response } = createResponse();

        try {
            await getDebtHistory(
                {
                    user: { userId: 'user-1' },
                    validated: {
                        query: { activePage: 2, paidPage: 1, limit: 5 }
                    }
                },
                response
            );
        } finally {
            debtService.getDebtHistoryForUser = originalMethod;
        }

        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.body, {
            count: {
                total: 3,
                active: 1,
                paid: 2
            },
            pagination: {
                active: {
                    page: 2,
                    limit: 5,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: true
                },
                paid: {
                    page: 1,
                    limit: 5,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: false
                }
            },
            active: [{ id: 'active-1' }],
            paid: [{ id: 'paid-1' }, { id: 'paid-2' }]
        });
    });

    it('preserva el código HTTP emitido por el servicio', async () => {
        const originalMethod = debtService.getDebtHistoryForUser;
        debtService.getDebtHistoryForUser = async () => {
            const error = new Error('Acceso denegado');
            error.statusCode = 403;
            throw error;
        };

        const { result, response } = createResponse();
        let propagatedError;

        try {
            await getDebtHistory(
                { user: { userId: 'user-1' } },
                response,
                error => {
                    propagatedError = error;
                }
            );
        } finally {
            debtService.getDebtHistoryForUser = originalMethod;
        }

        errorHandler(
            propagatedError,
            {},
            response,
            () => {}
        );

        assert.equal(result.statusCode, 403);
        assert.deepEqual(result.body, {
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Acceso denegado'
            }
        });
    });
});
