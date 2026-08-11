const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createUserService
} = require('../../src/services/factories/createUserService');

const createSession = () => ({
    aborted: false,
    committed: false,
    ended: false,
    async withTransaction(work) {
        try {
            await work();
            this.committed = true;
        } catch (error) {
            this.aborted = true;
            throw error;
        }
    },
    async endSession() {
        this.ended = true;
    }
});

const createDependencies = ({
    deactivate = async id => ({ _id: id, state: false }),
    existingUser = { _id: 'user-1', state: true },
    hasActiveDebts = false
} = {}) => {
    const calls = [];
    const session = createSession();
    const service = createUserService({
        debtRepository: {
            async existsActiveByParticipant(id, options) {
                calls.push(['existsActiveByParticipant', id, options]);
                return hasActiveDebts;
            }
        },
        mongoose: {
            async startSession() {
                calls.push(['startSession']);
                return session;
            }
        },
        passwordHasher: {},
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

    return { calls, service, session };
};

describe('userService: desactivación segura', () => {
    it('rechaza desactivar una cuenta distinta antes de abrir sesión', async () => {
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
        const { calls, service, session } = createDependencies({
            existingUser: null
        });

        await assert.rejects(
            () => service.deleteUser('user-1', 'user-1'),
            error => (
                error.statusCode === 404
                && error.errorCode === 'USER_NOT_FOUND'
            )
        );

        assert.equal(session.aborted, true);
        assert.equal(session.ended, true);
        assert.equal(
            calls.some(([operation]) => (
                operation === 'existsActiveByParticipant'
                || operation === 'deactivateById'
            )),
            false
        );
    });

    it('rechaza con 409 una cuenta que participa en deudas activas', async () => {
        const { calls, service, session } = createDependencies({
            hasActiveDebts: true
        });

        await assert.rejects(
            () => service.deleteUser('user-1', 'user-1'),
            error => (
                error.statusCode === 409
                && error.errorCode === 'USER_HAS_ACTIVE_DEBTS'
            )
        );

        assert.equal(session.aborted, true);
        assert.equal(session.ended, true);
        assert.equal(
            calls.some(([operation]) => operation === 'deactivateById'),
            false
        );
    });

    it('desactiva la cuenta sin deudas usando una sola sesión', async () => {
        const { calls, service, session } = createDependencies();

        const result = await service.deleteUser('user-1', 'user-1');

        assert.deepEqual(result, { _id: 'user-1', state: false });
        assert.equal(session.committed, true);
        assert.equal(session.ended, true);
        assert.deepEqual(calls, [
            ['startSession'],
            ['findActiveById', 'user-1', { session }],
            ['existsActiveByParticipant', 'user-1', { session }],
            ['deactivateById', 'user-1', { session }]
        ]);
    });

    it('aborta y cierra la sesión si falla la desactivación', async () => {
        const failure = new Error('Fallo simulado');
        const { service, session } = createDependencies({
            deactivate: async () => {
                throw failure;
            }
        });

        await assert.rejects(
            () => service.deleteUser('user-1', 'user-1'),
            failure
        );

        assert.equal(session.aborted, true);
        assert.equal(session.committed, false);
        assert.equal(session.ended, true);
    });
});
