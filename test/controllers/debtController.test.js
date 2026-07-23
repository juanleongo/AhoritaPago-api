const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const debtService = require('../../src/services/debtservice');
const { getDebtHistory } = require('../../src/controllers/debt');

const createResponse = () => {
    const result = {
        statusCode: null,
        body: null
    };

    return {
        result,
        response: {
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
        debtService.getDebtHistoryForUser = async userId => {
            assert.equal(userId, 'user-1');
            return {
                active: [{ id: 'active-1' }],
                paid: [{ id: 'paid-1' }, { id: 'paid-2' }]
            };
        };

        const { result, response } = createResponse();

        try {
            await getDebtHistory(
                { user: { userId: 'user-1' } },
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

        try {
            await getDebtHistory(
                { user: { userId: 'user-1' } },
                response
            );
        } finally {
            debtService.getDebtHistoryForUser = originalMethod;
        }

        assert.equal(result.statusCode, 403);
        assert.deepEqual(result.body, { error: 'Acceso denegado' });
    });
});
