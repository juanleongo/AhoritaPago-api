const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../../src/models/user');
const Group = require('../../src/models/group');
const Debt = require('../../src/models/debt');
const userRepository = require('../../src/repositories/user');
const groupRepository = require('../../src/repositories/group');
const debtRepository = require('../../src/repositories/debt');
const {
    applyTransaction,
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
            'countActiveByNickname',
            'create',
            'deactivateById',
            'findActiveById',
            'findActiveByNickname',
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
            'findAllActiveByUser',
            'findByCode',
            'findById',
            'updateById'
        ]);
    });

    it('expone un contrato uniforme para deudas', () => {
        assertContract(debtRepository, [
            'countHistoryByParticipant',
            'create',
            'deleteById',
            'existsActiveByParticipant',
            'findActiveByDebtor',
            'findActiveByParticipant',
            'findActiveByParticipantAndGroup',
            'findById',
            'findHistoryByParticipant',
            'getActiveBalanceByUserId',
            'updateById'
        ]);
    });

    it('traduce el contexto transaccional a una sesión de Mongoose', () => {
        const transaction = { id: 'transaction-1' };
        const query = {
            receivedSession: null,
            session(receivedSession) {
                this.receivedSession = receivedSession;
                return this;
            }
        };

        assert.equal(applyTransaction(query, { transaction }), query);
        assert.equal(query.receivedSession, transaction);
        assert.deepEqual(
            buildWriteOptions({ transaction }, { new: true }),
            { new: true, session: transaction }
        );
    });

    it('filtra por estado activo al buscar usuarios por nickname', async () => {
        const originalFind = User.find;
        let receivedFilter;
        const receivedQuery = {};
        const query = {
            sort(value) {
                receivedQuery.sort = value;
                return this;
            },
            skip(value) {
                receivedQuery.skip = value;
                return this;
            },
            limit(value) {
                receivedQuery.limit = value;
                return this;
            },
            select() {
                return this;
            }
        };

        User.find = filter => {
            receivedFilter = filter;
            return query;
        };

        try {
            await userRepository.searchActiveByNickname(
                'ana',
                { page: 2, limit: 5 }
            );
        } finally {
            User.find = originalFind;
        }

        assert.equal(receivedFilter.state, true);
        assert.ok(receivedFilter.nickname instanceof RegExp);
        assert.deepEqual(receivedQuery, {
            sort: { nickname: 1, _id: 1 },
            skip: 5,
            limit: 5
        });
    });

    it('cuenta usuarios con el mismo filtro de búsqueda activa', async () => {
        const originalCountDocuments = User.countDocuments;
        let receivedFilter;

        User.countDocuments = filter => {
            receivedFilter = filter;
            return 4;
        };

        try {
            assert.equal(
                await userRepository.countActiveByNickname('ana'),
                4
            );
        } finally {
            User.countDocuments = originalCountDocuments;
        }

        assert.equal(receivedFilter.state, true);
        assert.ok(receivedFilter.nickname instanceof RegExp);
        assert.equal(receivedFilter.nickname.test('Diana'), true);
    });

    it('pagina y ordena el historial en MongoDB según su estado', async () => {
        const originalFind = Debt.find;
        const operations = [];
        let receivedFilter;
        const query = {
            sort(value) {
                operations.push(['sort', value]);
                return this;
            },
            skip(value) {
                operations.push(['skip', value]);
                return this;
            },
            limit(value) {
                operations.push(['limit', value]);
                return this;
            },
            populate() {
                return this;
            }
        };

        Debt.find = filter => {
            receivedFilter = filter;
            return query;
        };

        try {
            await debtRepository.findHistoryByParticipant(
                '507f1f77bcf86cd799439011',
                { state: false, page: 3, limit: 10 }
            );
        } finally {
            Debt.find = originalFind;
        }

        assert.deepEqual(receivedFilter, {
            state: false,
            $or: [
                { creditor: '507f1f77bcf86cd799439011' },
                { debtor: '507f1f77bcf86cd799439011' }
            ]
        });
        assert.deepEqual(operations, [
            ['sort', {
                paymentDate: -1,
                debtDate: -1,
                _id: -1
            }],
            ['skip', 20],
            ['limit', 10]
        ]);
    });

    it('cuenta el historial con el mismo filtro de participante y estado', async () => {
        const originalCountDocuments = Debt.countDocuments;
        let receivedFilter;

        Debt.countDocuments = filter => {
            receivedFilter = filter;
            return 7;
        };

        try {
            assert.equal(
                await debtRepository.countHistoryByParticipant(
                    '507f1f77bcf86cd799439011',
                    { state: true }
                ),
                7
            );
        } finally {
            Debt.countDocuments = originalCountDocuments;
        }

        assert.equal(receivedFilter.state, true);
        assert.deepEqual(receivedFilter.$or, [
            { creditor: '507f1f77bcf86cd799439011' },
            { debtor: '507f1f77bcf86cd799439011' }
        ]);
    });

    it('calcula los saldos usando solo deudas activas', async () => {
        const originalAggregate = Debt.aggregate;
        const userId = '507f1f77bcf86cd799439011';
        let receivedPipeline;

        Debt.aggregate = async pipeline => {
            receivedPipeline = pipeline;
            return [{ owe: 45, owes: 80 }];
        };

        try {
            assert.deepEqual(
                await debtRepository.getActiveBalanceByUserId(userId),
                { owe: 45, owes: 80 }
            );
        } finally {
            Debt.aggregate = originalAggregate;
        }

        assert.equal(receivedPipeline[0].$match.state, true);
        assert.equal(
            receivedPipeline[0].$match.$or[0].creditor.toString(),
            userId
        );
        assert.equal(
            receivedPipeline[0].$match.$or[1].debtor.toString(),
            userId
        );
        assert.match(JSON.stringify(receivedPipeline), /\$sum/);
    });

    it('devuelve saldos en cero si no hay deudas activas', async () => {
        const originalAggregate = Debt.aggregate;
        Debt.aggregate = async () => [];

        try {
            assert.deepEqual(
                await debtRepository.getActiveBalanceByUserId(
                    '507f1f77bcf86cd799439011'
                ),
                { owe: 0, owes: 0 }
            );
        } finally {
            Debt.aggregate = originalAggregate;
        }
    });

    it('consulta deudas activas dentro de la transacción', async () => {
        const originalExists = Debt.exists;
        const transaction = { id: 'transaction-1' };
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
                    { transaction }
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
        assert.equal(receivedSession, transaction);
    });

    it('desactiva únicamente usuarios activos en la transacción', async () => {
        const originalFindOneAndUpdate = User.findOneAndUpdate;
        const transaction = { id: 'transaction-1' };
        let receivedOperation;

        User.findOneAndUpdate = (filter, update, options) => {
            receivedOperation = { filter, update, options };
            return { _id: filter._id, state: false };
        };

        try {
            await userRepository.deactivateById(
                'user-1',
                { transaction }
            );
        } finally {
            User.findOneAndUpdate = originalFindOneAndUpdate;
        }

        assert.deepEqual(receivedOperation, {
            filter: { _id: 'user-1', state: true },
            update: { state: false },
            options: { new: true, session: transaction }
        });
    });

    it('encapsula la incorporación de miembros y evita duplicados', async () => {
        const originalFindByIdAndUpdate = Group.findByIdAndUpdate;
        const transaction = { id: 'transaction-1' };
        let receivedOperation;

        Group.findByIdAndUpdate = (id, update, options) => {
            receivedOperation = { id, update, options };
            return { _id: id };
        };

        try {
            await groupRepository.addMemberById(
                'group-1',
                'user-1',
                { transaction }
            );
        } finally {
            Group.findByIdAndUpdate = originalFindByIdAndUpdate;
        }

        assert.deepEqual(receivedOperation, {
            id: 'group-1',
            update: { $addToSet: { members: 'user-1' } },
            options: {
                new: true,
                runValidators: true,
                session: transaction
            }
        });
    });
});
