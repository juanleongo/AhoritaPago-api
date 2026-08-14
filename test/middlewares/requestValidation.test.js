const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { allowOnlyFields } = require('../../src/middlewares/allowOnlyFields');
const { validateForms } = require('../../src/middlewares/validate-forms');
const { createDebtValidators } = require('../../src/validators/debtValidators');
const {
    createUserValidators,
    searchUsersValidators,
    userIdValidators
} = require('../../src/validators/userValidators');
const { loginValidators } = require('../../src/validators/authValidators');
const {
    historyPaginationValidators,
    listPaginationValidators,
    searchPaginationValidators,
    summaryPaginationValidators
} = require('../../src/validators/paginationValidators');

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
    it('normaliza espacios sin cambiar mayúsculas de identidad', async () => {
        const result = await runValidation(createUserValidators, {
            body: {
                name: '  Laura   De León  ',
                nickname: '  LEON  ',
                email: '  lomasFresa@gmail.com  ',
                password: '12345678'
            }
        });

        assert.equal(result.nextCalled, true);
        assert.deepEqual(result.req.validated.body, {
            name: 'Laura De León',
            nickname: 'LEON',
            email: 'lomasFresa@gmail.com',
            password: '12345678'
        });
    });

    it('rechaza contraseñas nuevas de menos de ocho caracteres', async () => {
        const result = await runValidation(createUserValidators, {
            body: {
                name: 'Laura',
                nickname: 'Laura',
                email: 'Laura@example.com',
                password: '1234567'
            }
        });

        assert.equal(result.nextCalled, false);
        assert.equal(result.error.errorCode, 'VALIDATION_ERROR');
        assert.equal(result.error.details[0].path, 'password');
    });

    it('acepta contraseñas largas sin reglas de composición', async () => {
        const password = '1'.repeat(500);
        const result = await runValidation(createUserValidators, {
            body: {
                name: 'Laura',
                nickname: 'Laura',
                email: 'Laura@example.com',
                password
            }
        });

        assert.equal(result.nextCalled, true);
        assert.equal(result.req.validated.body.password, password);
    });

    it('no aplica el mínimo nuevo durante el login de cuentas antiguas', async () => {
        const result = await runValidation(loginValidators, {
            body: {
                email: '  Laura@Example.com  ',
                password: 'corta'
            }
        });

        assert.equal(result.nextCalled, true);
        assert.deepEqual(result.req.validated.body, {
            email: 'Laura@Example.com',
            password: 'corta'
        });
    });

    it('normaliza una deuda expresada con miles colombianos', async () => {
        const creditorId = '507f1f77bcf86cd799439011';
        const debtorId = '507f191e810c19729de860ea';
        const result = await runValidation(createDebtValidators, {
            body: {
                description: '  Cena del grupo  ',
                value: '50.000',
                group: creditorId,
                debtor: [debtorId]
            }
        });

        assert.equal(result.error, undefined);
        assert.equal(result.nextCalled, true);
        assert.deepEqual(result.req.validated.body, {
            description: 'Cena del grupo',
            value: 50000,
            group: creditorId,
            debtor: [debtorId]
        });
    });

    it('acepta pesos sin separador y rechaza cantidades decimales', async () => {
        const validResult = await runValidation(createDebtValidators, {
            body: {
                description: 'Cena',
                value: 1500,
                group: '507f1f77bcf86cd799439011',
                debtor: ['507f191e810c19729de860ea']
            }
        });
        const invalidResult = await runValidation(createDebtValidators, {
            body: {
                description: 'Cena',
                value: 1.5,
                group: '507f1f77bcf86cd799439011',
                debtor: ['507f191e810c19729de860ea']
            }
        });

        assert.equal(validResult.nextCalled, true);
        assert.equal(validResult.req.validated.body.value, 1500);
        assert.equal(invalidResult.nextCalled, false);
        assert.equal(invalidResult.error.errorCode, 'VALIDATION_ERROR');
        assert.equal(invalidResult.error.details[0].path, 'value');
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

    it('rechaza deudores repetidos antes de ejecutar el servicio', async () => {
        const userId = '507f191e810c19729de860ea';
        const result = await runValidation(createDebtValidators, {
            body: {
                description: 'Cena',
                value: 100,
                group: '507f1f77bcf86cd799439011',
                debtor: [userId, userId]
            },
            user: { userId: '507f191e810c19729de860eb' }
        });

        assert.equal(result.nextCalled, false);
        assert.equal(result.error.errorCode, 'VALIDATION_ERROR');
        assert.equal(result.error.details[0].path, 'debtor');
        assert.match(result.error.details[0].message, /repetidos/i);
    });

    it('rechaza al acreedor dentro de la lista de deudores', async () => {
        const creditorId = '507f191e810c19729de860ea';
        const result = await runValidation(createDebtValidators, {
            body: {
                description: 'Cena',
                value: 100,
                group: '507f1f77bcf86cd799439011',
                debtor: [creditorId]
            },
            user: { userId: creditorId }
        });

        assert.equal(result.nextCalled, false);
        assert.equal(result.error.errorCode, 'VALIDATION_ERROR');
        assert.equal(result.error.details[0].path, 'debtor');
        assert.match(result.error.details[0].message, /acreedor/i);
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

    it('aplica la paginación predeterminada del historial', async () => {
        const result = await runValidation(historyPaginationValidators, {
            query: {}
        });

        assert.equal(result.nextCalled, true);
        assert.deepEqual(result.req.validated.query, {
            activePage: 1,
            paidPage: 1,
            limit: 20
        });
    });

    it('valida páginas simples y páginas independientes del resumen', async () => {
        const list = await runValidation(listPaginationValidators, {
            query: { page: '2', limit: '10' }
        });
        const summary = await runValidation(summaryPaginationValidators, {
            query: { debtsPage: '3', creditsPage: '2', limit: '5' }
        });

        assert.deepEqual(list.req.validated.query, {
            page: 2,
            limit: 10
        });
        assert.deepEqual(summary.req.validated.query, {
            debtsPage: 3,
            creditsPage: 2,
            limit: 5
        });
    });

    it('convierte la paginación de búsqueda a números', async () => {
        const result = await runValidation(searchPaginationValidators, {
            query: { page: '3', limit: '25' }
        });

        assert.equal(result.nextCalled, true);
        assert.deepEqual(result.req.validated.query, {
            page: 3,
            limit: 25
        });
    });

    it('rechaza páginas inválidas y límites mayores que 50', async () => {
        const result = await runValidation(searchPaginationValidators, {
            query: { page: '0', limit: '51' }
        });

        assert.equal(result.nextCalled, false);
        assert.equal(result.error.errorCode, 'VALIDATION_ERROR');
        assert.deepEqual(
            result.error.details.map(detail => detail.path).sort(),
            ['limit', 'page']
        );
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

    it('rechaza parámetros de query desconocidos', () => {
        const req = {
            query: { page: '1', sortBy: 'password' }
        };
        let middlewareError;

        allowOnlyFields(['page'], 'query')(req, {}, error => {
            middlewareError = error;
        });

        assert.equal(middlewareError.statusCode, 400);
        assert.equal(middlewareError.errorCode, 'UNKNOWN_FIELDS');
        assert.deepEqual(middlewareError.details, [
            { path: 'sortBy', location: 'query' }
        ]);
    });
});
