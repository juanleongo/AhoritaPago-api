const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createGroupService
} = require('../../src/services/factories/createGroupService');

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
    existingGroup = {
        _id: 'group-1',
        admin: 'admin-1',
        members: ['admin-1']
    },
    existsActiveByGroup = async () => false
} = {}) => {
    const calls = [];
    const { state, transaction, transactionManager } = (
        createTestTransactionManager(calls)
    );
    const service = createGroupService({
        debtRepository: {
            async existsActiveByGroup(id, options) {
                calls.push(['existsActiveByGroup', id, options]);
                return existsActiveByGroup(id, options);
            }
        },
        groupRepository: {
            async deactivateById(id, options) {
                calls.push(['deactivateById', id, options]);
                return deactivate(id, options);
            },
            async lockActiveById(id, options) {
                calls.push(['lockActiveById', id, options]);
                return existingGroup;
            }
        },
        transactionManager
    });

    return { calls, service, state, transaction };
};

describe('groupService: desactivación segura', () => {
    it('devuelve 404 si el grupo ya no está activo', async () => {
        const { calls, service, state } = createDependencies({
            existingGroup: null
        });

        await assert.rejects(
            () => service.deleteGroup('group-1', 'admin-1'),
            error => (
                error.statusCode === 404
                && error.errorCode === 'GROUP_NOT_FOUND'
            )
        );

        assert.equal(state.aborted, true);
        assert.equal(
            calls.some(([operation]) => (
                operation === 'existsActiveByGroup'
                || operation === 'deactivateById'
            )),
            false
        );
    });

    it('rechaza a quien no sea administrador antes de consultar deudas', async () => {
        const { calls, service, state } = createDependencies();

        await assert.rejects(
            () => service.deleteGroup('group-1', 'member-1'),
            error => (
                error.statusCode === 403
                && error.errorCode === 'GROUP_DELETE_FORBIDDEN'
            )
        );

        assert.equal(state.aborted, true);
        assert.equal(
            calls.some(([operation]) => (
                operation === 'existsActiveByGroup'
                || operation === 'deactivateById'
            )),
            false
        );
    });

    it('rechaza con 409 un grupo que tiene deudas activas', async () => {
        const { calls, service, state } = createDependencies({
            existsActiveByGroup: async () => true
        });

        await assert.rejects(
            () => service.deleteGroup('group-1', 'admin-1'),
            error => (
                error.statusCode === 409
                && error.errorCode === 'GROUP_HAS_ACTIVE_DEBTS'
            )
        );

        assert.equal(state.aborted, true);
        assert.equal(
            calls.some(([operation]) => operation === 'deactivateById'),
            false
        );
    });

    it('desactiva el grupo usando un único contexto transaccional', async () => {
        const { calls, service, state, transaction } = createDependencies();

        const result = await service.deleteGroup('group-1', 'admin-1');

        assert.deepEqual(result, { _id: 'group-1', state: false });
        assert.equal(state.committed, true);
        assert.deepEqual(calls, [
            ['runInTransaction'],
            ['lockActiveById', 'group-1', { transaction }],
            ['existsActiveByGroup', 'group-1', { transaction }],
            ['deactivateById', 'group-1', { transaction }]
        ]);
    });

    it('aborta si falla la consulta de deudas', async () => {
        const failure = new Error('Fallo de consulta');
        const { calls, service, state } = createDependencies({
            existsActiveByGroup: async () => { throw failure; }
        });

        await assert.rejects(
            () => service.deleteGroup('group-1', 'admin-1'),
            failure
        );

        assert.equal(state.aborted, true);
        assert.equal(state.committed, false);
        assert.equal(
            calls.some(([operation]) => operation === 'deactivateById'),
            false
        );
    });

    it('aborta si falla la desactivación', async () => {
        const failure = new Error('Fallo de desactivación');
        const { service, state } = createDependencies({
            deactivate: async () => { throw failure; }
        });

        await assert.rejects(
            () => service.deleteGroup('group-1', 'admin-1'),
            failure
        );

        assert.equal(state.aborted, true);
        assert.equal(state.committed, false);
    });
});
