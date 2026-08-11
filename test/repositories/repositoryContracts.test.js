const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../../src/models/user');
const Group = require('../../src/models/group');
const Debt = require('../../src/models/debt');
const userRepository = require('../../src/repositories/user');
const groupRepository = require('../../src/repositories/group');
const debtRepository = require('../../src/repositories/debt');
const {
    applySession,
    buildWriteOptions
} = require('../../src/repositories/repositoryOptions');

const assertContract = (repository, expectedMethods) => {
    assert.deepEqual(Object.keys(repository).sort(), expectedMethods.sort());

    expectedMethods.forEach(method => {
        assert.equal(typeof repository[method], 'function');
    });
};

describe('contratos de repositorios', () => {
    it('expone un contrato uniforme para usuarios', () => {
        assertContract(userRepository, [
            'create',
            'deactivateById',
            'findActiveById',
            'findActiveByNickname',
            'findAllActive',
            'findByEmail',
            'findById',
            'findByNickname',
            'searchActiveByNickname',
            'updateById'
        ]);
    });

    it('expone un contrato uniforme para grupos', () => {
        assertContract(groupRepository, [
            'addMemberById',
            'create',
            'deactivateById',
            'findActiveByCode',
            'findActiveById',
            'findAllActive',
            'findAllActiveByUser',
            'findByCode',
            'findById',
            'findByName',
            'updateById'
        ]);
    });

    it('expone un contrato uniforme para deudas', () => {
        assertContract(debtRepository, [
            'create',
            'deleteById',
            'existsActiveByParticipant',
            'findActiveByDebtor',
            'findActiveByParticipant',
            'findActiveByParticipantAndGroup',
            'findById',
            'findHistoryByParticipant',
            'updateById'
        ]);
    });

    it('propaga la sesión mediante un objeto options común', () => {
        const session = { id: 'session-1' };
        const query = {
            receivedSession: null,
            session(receivedSession) {
                this.receivedSession = receivedSession;
                return this;
            }
        };

        assert.equal(applySession(query, { session }), query);
        assert.equal(query.receivedSession, session);
        assert.deepEqual(
            buildWriteOptions({ session }, { new: true }),
            { new: true, session }
        );
    });

    it('filtra por estado activo al buscar usuarios por nickname', async () => {
        const originalFind = User.find;
        let receivedFilter;
        const query = {
            select() {
                return this;
            }
        };

        User.find = filter => {
            receivedFilter = filter;
            return query;
        };

        try {
            await userRepository.searchActiveByNickname('ana');
        } finally {
            User.find = originalFind;
        }

        assert.equal(receivedFilter.state, true);
        assert.ok(receivedFilter.nickname instanceof RegExp);
    });

    it('consulta deudas activas de acreedor y deudor con la sesión', async () => {
        const originalExists = Debt.exists;
        const session = { id: 'session-1' };
        let receivedFilter;
        let receivedSession;

        Debt.exists = filter => {
            receivedFilter = filter;
            return {
                session(value) {
                    receivedSession = value;
                    return this;
                }
            };
        };

        try {
            assert.equal(
                await debtRepository.existsActiveByParticipant(
                    'user-1',
                    { session }
                ),
                true
            );
        } finally {
            Debt.exists = originalExists;
        }

        assert.deepEqual(receivedFilter, {
            state: true,
            $or: [
                { creditor: 'user-1' },
                { debtor: 'user-1' }
            ]
        });
        assert.equal(receivedSession, session);
    });

    it('desactiva únicamente usuarios activos dentro de la sesión', async () => {
        const originalFindOneAndUpdate = User.findOneAndUpdate;
        const session = { id: 'session-1' };
        let receivedOperation;

        User.findOneAndUpdate = (filter, update, options) => {
            receivedOperation = { filter, update, options };
            return { _id: filter._id, state: false };
        };

        try {
            await userRepository.deactivateById(
                'user-1',
                { session }
            );
        } finally {
            User.findOneAndUpdate = originalFindOneAndUpdate;
        }

        assert.deepEqual(receivedOperation, {
            filter: { _id: 'user-1', state: true },
            update: { state: false },
            options: { new: true, session }
        });
    });

    it('encapsula la incorporación de miembros y evita duplicados', async () => {
        const originalFindByIdAndUpdate = Group.findByIdAndUpdate;
        const session = { id: 'session-1' };
        let receivedOperation;

        Group.findByIdAndUpdate = (id, update, options) => {
            receivedOperation = { id, update, options };
            return { _id: id };
        };

        try {
            await groupRepository.addMemberById(
                'group-1',
                'user-1',
                { session }
            );
        } finally {
            Group.findByIdAndUpdate = originalFindByIdAndUpdate;
        }

        assert.deepEqual(receivedOperation, {
            id: 'group-1',
            update: { $addToSet: { members: 'user-1' } },
            options: { new: true, runValidators: true, session }
        });
    });
});
