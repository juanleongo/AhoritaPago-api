const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createUserService
} = require('../../src/services/factories/createUserService');

const createTestTransactionManager = calls => {
    const transaction = { id: 'transaction-1' };
    const state = { aborted: false, committed: false };
    const transactionManager = {
        async runInTransaction(work) {
            calls.push(['runInTransaction']);
            try {
                const result = await work(transaction);
                state.committed = true;
                return result;
            } catch (error) {
                state.aborted = true;
                throw error;
            }
        }
    };

    return { state, transaction, transactionManager };
};

const createDependencies = ({
    deactivate = async id => ({ _id: id, state: false }),
    existingUser = { _id: 'user-1', state: true },
    hasActiveDebts = false
} = {}) => {
    const calls = [];
    const { state, transaction, transactionManager } = (
        createTestTransactionManager(calls)
    );
    const service = createUserService({
        debtRepository: {
            async existsActiveByParticipant(id, options) {
                calls.push(['existsActiveByParticipant', id, options]);
                return hasActiveDebts;
            }
        },
        passwordHasher: {},
        transactionManager,
        userRepository: {
            async deactivateById(id, options) {
                calls.push(['deactivateById', id, options]);
                return deactivate(id, options);
            },
            async findActiveById(id, options) {
                calls.push(['findActiveById', id, options]);
                return existingUser;
            }
        }
    });

    return { calls, service, state, transaction };
};

describe('userService: desactivación segura', () => {
    it('rechaza una cuenta distinta antes de abrir la transacción', async () => {
        const { calls, service } = createDependencies();

        await assert.rejects(
            () => service.deleteUser('user-2', 'user-1'),
            error => (
                error.statusCode === 403
                && error.errorCode === 'USER_DELETE_FORBIDDEN'
            )
        );

        assert.deepEqual(calls, []);
    });

    it('devuelve 404 si el usuario ya no está activo', async () => {
        const { calls, service, state } = createDependencies({
            existingUser: null
        });

        await assert.rejects(
            () => service.deleteUser('user-1', 'user-1'),
            error => (
                error.statusCode === 404
                && error.errorCode === 'USER_NOT_FOUND'
            )
        );

        assert.equal(state.aborted, true);
        assert.equal(
            calls.some(([operation]) => (
                operation === 'existsActiveByParticipant'
                || operation === 'deactivateById'
            )),
            false
        );
    });

    it('rechaza con 409 una cuenta que participa en deudas activas', async () => {
        const { calls, service, state } = createDependencies({
            hasActiveDebts: true
        });

        await assert.rejects(
            () => service.deleteUser('user-1', 'user-1'),
            error => (
                error.statusCode === 409
                && error.errorCode === 'USER_HAS_ACTIVE_DEBTS'
            )
        );

        assert.equal(state.aborted, true);
        assert.equal(
            calls.some(([operation]) => operation === 'deactivateById'),
            false
        );
    });

    it('desactiva la cuenta usando un único contexto', async () => {
        const { calls, service, state, transaction } = createDependencies();

        const result = await service.deleteUser('user-1', 'user-1');

        assert.deepEqual(result, { _id: 'user-1', state: false });
        assert.equal(state.committed, true);
        assert.deepEqual(calls, [
            ['runInTransaction'],
            ['findActiveById', 'user-1', { transaction }],
            ['existsActiveByParticipant', 'user-1', { transaction }],
            ['deactivateById', 'user-1', { transaction }]
        ]);
    });

    it('aborta la transacción si falla la desactivación', async () => {
        const failure = new Error('Fallo simulado');
        const { service, state } = createDependencies({
            deactivate: async () => {
                throw failure;
            }
        });

        await assert.rejects(
            () => service.deleteUser('user-1', 'user-1'),
            failure
        );

        assert.equal(state.aborted, true);
        assert.equal(state.committed, false);
    });
});
