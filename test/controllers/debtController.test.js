const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createDebtController
} = require('../../src/controllers/factories/createDebtController');
const { errorHandler } = require('../../src/middlewares/errorHandler');

const createResponse = () => {
    const result = {
        statusCode: null,
        body: null,
        headers: {}
    };

    return {
        result,
        response: {
            headersSent: false,
            set(headers) {
                Object.assign(result.headers, headers);
                return this;
            },
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
    it('conserva el arreglo legacy y publica la paginación en headers', async () => {
        const debts = [{ id: 'debt-1' }];
        const controller = createDebtController({
            debtService: {
                async getAllDebts(userId, pagination) {
                    assert.equal(userId, 'user-1');
                    assert.deepEqual(pagination, { page: 2, limit: 5 });
                    return {
                        count: 12,
                        pagination: {
                            page: 2,
                            limit: 5,
                            totalPages: 3,
                            hasNextPage: true,
                            hasPreviousPage: true
                        },
                        debts
                    };
                }
            }
        });
        const { result, response } = createResponse();

        await controller.getAllDebts({
            user: { userId: 'user-1' },
            validated: { query: { page: 2, limit: 5 } }
        }, response, error => { throw error; });

        assert.deepEqual(result.body, debts);
        assert.deepEqual(result.headers, {
            'X-Limit': '5',
            'X-Page': '2',
            'X-Total-Count': '12',
            'X-Total-Pages': '3'
        });
    });

    it('devuelve conteos y listas separadas en formato JSON', async () => {
        const controller = createDebtController({
            debtService: {
                async getDebtHistoryForUser(userId, pagination) {
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
                }
            }
        });
        const { result, response } = createResponse();

        await controller.getDebtHistory(
            {
                user: { userId: 'user-1' },
                validated: {
                    query: { activePage: 2, paidPage: 1, limit: 5 }
                }
            },
            response
        );

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
        const controller = createDebtController({
            debtService: {
                async getDebtHistoryForUser() {
                    const error = new Error('Acceso denegado');
                    error.statusCode = 403;
                    throw error;
                }
            }
        });
        const { result, response } = createResponse();
        let propagatedError;

        await controller.getDebtHistory(
            { user: { userId: 'user-1' } },
            response,
            error => {
                propagatedError = error;
            }
        );

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
