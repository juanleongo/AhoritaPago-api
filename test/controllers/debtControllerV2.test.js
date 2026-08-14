const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createDebtControllerV2
} = require('../../src/controllers/v2/createDebtController');
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

describe('debtController v2: paginación e historial', () => {
    it('propaga la paginación validada y la publica dentro de meta', async () => {
        const debt = { _id: 'debt-1', description: 'Cena', debtor: [] };
        const controller = createDebtControllerV2({
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
                        debts: [debt]
                    };
                }
            }
        });
        const { result, response } = createResponse();

        await controller.getAllDebts({
            user: { userId: 'user-1' },
            validated: { query: { page: 2, limit: 5 } }
        }, response, error => { throw error; });

        assert.equal(result.statusCode, 200);
        assert.equal(result.body.success, true);
        assert.equal(result.body.data[0].id, 'debt-1');
        assert.deepEqual(result.body.meta, {
            count: 12,
            pagination: {
                page: 2,
                limit: 5,
                totalPages: 3,
                hasNextPage: true,
                hasPreviousPage: true
            }
        });
    });

    it('devuelve deudas activas y pagadas en el contrato v2', async () => {
        const controller = createDebtControllerV2({
            debtService: {
                async getDebtHistoryForUser(userId, pagination) {
                    assert.equal(userId, 'user-1');
                    assert.deepEqual(pagination, {
                        activePage: 2,
                        paidPage: 1,
                        limit: 5
                    });
                    return {
                        count: { total: 2, active: 1, paid: 1 },
                        pagination: {
                            active: { page: 2, limit: 5, totalPages: 1 },
                            paid: { page: 1, limit: 5, totalPages: 1 }
                        },
                        active: [{ _id: 'active-1', debtor: [] }],
                        paid: [{ _id: 'paid-1', debtor: [] }]
                    };
                }
            }
        });
        const { result, response } = createResponse();

        await controller.getDebtHistory({
            user: { userId: 'user-1' },
            validated: {
                query: { activePage: 2, paidPage: 1, limit: 5 }
            }
        }, response, error => { throw error; });

        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.body.data.active.map(item => item.id), [
            'active-1'
        ]);
        assert.deepEqual(result.body.data.paid.map(item => item.id), [
            'paid-1'
        ]);
        assert.deepEqual(result.body.meta.count, {
            total: 2,
            active: 1,
            paid: 1
        });
    });

    it('preserva el código HTTP emitido por el servicio', async () => {
        const controller = createDebtControllerV2({
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
            error => { propagatedError = error; }
        );
        errorHandler(propagatedError, {}, response, () => {});

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
