const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { allowOnlyFields } = require('../../src/middlewares/allowOnlyFields');
const { validateForms } = require('../../src/middlewares/validate-forms');
const { createDebtValidators } = require('../../src/validators/debtValidators');
const {
    searchUsersValidators,
    userIdValidators
} = require('../../src/validators/userValidators');

const runValidation = async (validators, requestData) => {
    const req = {
        body: {},
        params: {},
        query: {},
        ...requestData
    };

    for (const validator of validators) {
        await validator.run(req);
    }

    let nextError;
    let nextCalled = false;

    validateForms(req, {}, error => {
        nextError = error;
        nextCalled = !error;
    });

    return { error: nextError, nextCalled, req };
};

describe('validación y DTO de solicitud', () => {
    it('sanitiza una deuda válida y convierte value a número', async () => {
        const creditorId = '507f1f77bcf86cd799439011';
        const debtorId = '507f191e810c19729de860ea';
        const result = await runValidation(createDebtValidators, {
            body: {
                description: '  Cena del grupo  ',
                value: '50000.50',
                group: creditorId,
                debtor: [debtorId]
            }
        });

        assert.equal(result.error, undefined);
        assert.equal(result.nextCalled, true);
        assert.deepEqual(result.req.validated.body, {
            description: 'Cena del grupo',
            value: 50000.5,
            group: creditorId,
            debtor: [debtorId]
        });
    });

    it('rechaza valores y ObjectId inválidos en una deuda', async () => {
        const result = await runValidation(createDebtValidators, {
            body: {
                description: 'Cena',
                value: 0,
                group: 'grupo-invalido',
                debtor: ['usuario-invalido']
            }
        });

        assert.equal(result.nextCalled, false);
        assert.equal(result.error.statusCode, 400);
        assert.equal(result.error.errorCode, 'VALIDATION_ERROR');
        assert.deepEqual(
            result.error.details.map(detail => detail.path).sort(),
            ['debtor[0]', 'group', 'value']
        );
    });

    it('valida y conserva parámetros ObjectId', async () => {
        const id = '507f1f77bcf86cd799439011';
        const result = await runValidation(userIdValidators, {
            params: { id }
        });

        assert.equal(result.nextCalled, true);
        assert.deepEqual(result.req.validated.params, { id });
    });

    it('sanitiza parámetros de búsqueda', async () => {
        const result = await runValidation(searchUsersValidators, {
            params: { searchTerm: '  leo  ' }
        });

        assert.equal(result.nextCalled, true);
        assert.deepEqual(result.req.validated.params, {
            searchTerm: 'leo'
        });
    });

    it('limita la longitud de los términos de búsqueda', async () => {
        const result = await runValidation(searchUsersValidators, {
            params: { searchTerm: 'a'.repeat(51) }
        });

        assert.equal(result.nextCalled, false);
        assert.equal(result.error.errorCode, 'VALIDATION_ERROR');
        assert.equal(result.error.details[0].path, 'searchTerm');
    });

    it('rechaza campos desconocidos con detalles seguros', () => {
        const req = {
            body: {
                name: 'Laura',
                state: false,
                owe: 999999
            }
        };
        let middlewareError;

        allowOnlyFields(['name'])(req, {}, error => {
            middlewareError = error;
        });

        assert.equal(middlewareError.statusCode, 400);
        assert.equal(middlewareError.errorCode, 'UNKNOWN_FIELDS');
        assert.deepEqual(middlewareError.details, [
            { path: 'state', location: 'body' },
            { path: 'owe', location: 'body' }
        ]);
    });
});
