const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const debtRepository = require('../../src/repositories/debt');
const groupRepository = require('../../src/repositories/group');
const {
    createDebtService
} = require('../../src/services/debt/createDebtService');

const defaultTransactionManager = {
    runInTransaction: work => work({ id: 'default-transaction' })
};
const debtService = createDebtService({
    debtRepository,
    groupRepository,
    transactionManager: defaultTransactionManager
});

const withStubs = async (target, stubs, work) => {
    const originals = {};

    Object.entries(stubs).forEach(([name, implementation]) => {
        originals[name] = target[name];
        target[name] = implementation;
    });

    try {
        return await work();
    } finally {
        Object.entries(originals).forEach(([name, implementation]) => {
            target[name] = implementation;
        });
    }
};

const createTestTransactionManager = () => {
    const transaction = { id: 'transaction-1' };
    const state = { aborted: false, committed: false };
    const transactionManager = {
        async runInTransaction(work) {
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

const createService = transactionManager => createDebtService({
    debtRepository,
    groupRepository,
    transactionManager
});

describe('debtService: historial y consistencia financiera', () => {
    it('pagina el listado activo del usuario como deudor', async () => {
        const calls = [];

        await withStubs(
            debtRepository,
            {
                findActiveByDebtor: async (userId, pagination) => {
                    calls.push(['find', userId, pagination]);
                    return [{ id: 'debt-1' }];
                },
                countActiveByDebtor: async userId => {
                    calls.push(['count', userId]);
                    return 7;
                }
            },
            async () => {
                const result = await debtService.getAllDebts(
                    'user-1',
                    { page: 2, limit: 3 }
                );

                assert.deepEqual(calls, [
                    ['find', 'user-1', { page: 2, limit: 3 }],
                    ['count', 'user-1']
                ]);
                assert.deepEqual(result, {
                    count: 7,
                    pagination: {
                        page: 2,
                        limit: 3,
                        totalPages: 3,
                        hasNextPage: true,
                        hasPreviousPage: true
                    },
                    debts: [{ id: 'debt-1' }]
                });
            }
        );
    });

    it('pagina deudas y créditos del resumen de forma independiente', async () => {
        const calls = [];
        const debt = {
            description: 'Cena',
            debtDate: new Date('2026-08-01'),
            value: 30,
            group: { name: 'Amigos' },
            creditor: { name: 'Laura' },
            debtor: [{ name: 'León' }]
        };

        await withStubs(
            debtRepository,
            {
                findActiveByDebtor: async (userId, pagination) => {
                    calls.push(['debts', userId, pagination]);
                    return [debt];
                },
                findActiveByCreditor: async (userId, pagination) => {
                    calls.push(['credits', userId, pagination]);
                    return [debt];
                },
                countActiveByDebtor: async () => 5,
                countActiveByCreditor: async () => 3
            },
            async () => {
                const result = await debtService.getDebtSummaryForUser(
                    'user-1',
                    { debtsPage: 2, creditsPage: 1, limit: 2 }
                );

                assert.deepEqual(calls, [
                    ['debts', 'user-1', { page: 2, limit: 2 }],
                    ['credits', 'user-1', { page: 1, limit: 2 }]
                ]);
                assert.deepEqual(result.count, {
                    total: 8,
                    debts: 5,
                    credits: 3
                });
                assert.equal(result.pagination.debts.page, 2);
                assert.equal(result.pagination.credits.page, 1);
                assert.equal(result.debts[0].with, 'Laura');
                assert.equal(result.credits[0].with, 'León');
            }
        );
    });

    it('autoriza y pagina las deudas activas de un grupo', async () => {
        const calls = [];

        await withStubs(
            groupRepository,
            {
                findActiveByCode: async code => ({
                    _id: 'group-1',
                    code,
                    members: ['user-1']
                })
            },
            async () => {
                await withStubs(
                    debtRepository,
                    {
                        findActiveByParticipantAndGroup: async (
                            userId,
                            groupId,
                            pagination
                        ) => {
                            calls.push(['find', userId, groupId, pagination]);
                            return [{ id: 'debt-1' }];
                        },
                        countActiveByParticipantAndGroup: async (
                            userId,
                            groupId
                        ) => {
                            calls.push(['count', userId, groupId]);
                            return 4;
                        }
                    },
                    async () => {
                        const result = await debtService
                            .getDebtsForUserInGroupByCode(
                                'user-1',
                                'ABC123',
                                { page: 2, limit: 2 }
                            );

                        assert.equal(result.count, 4);
                        assert.equal(result.pagination.page, 2);
                    }
                );
            }
        );

        assert.deepEqual(calls, [
            ['find', 'user-1', 'group-1', { page: 2, limit: 2 }],
            ['count', 'user-1', 'group-1']
        ]);
    });

    it('consulta páginas separadas y devuelve totales del historial', async () => {
        const receivedQueries = [];

        await withStubs(
            debtRepository,
            {
                findHistoryByParticipant: async (userId, query) => {
                    assert.equal(userId, 'user-1');
                    receivedQueries.push(['find', query]);
                    return query.state
                        ? [{ id: 'active-page-item' }]
                        : [{ id: 'paid-page-item' }];
                },
                countHistoryByParticipant: async (userId, query) => {
                    assert.equal(userId, 'user-1');
                    receivedQueries.push(['count', query]);
                    return query.state ? 5 : 3;
                }
            },
            async () => {
                const history = await debtService.getDebtHistoryForUser(
                    'user-1',
                    { activePage: 2, paidPage: 1, limit: 2 }
                );

                assert.deepEqual(receivedQueries, [
                    ['find', { state: true, page: 2, limit: 2 }],
                    ['find', { state: false, page: 1, limit: 2 }],
                    ['count', { state: true }],
                    ['count', { state: false }]
                ]);
                assert.deepEqual(history, {
                    count: { total: 8, active: 5, paid: 3 },
                    pagination: {
                        active: {
                            page: 2,
                            limit: 2,
                            totalPages: 3,
                            hasNextPage: true,
                            hasPreviousPage: true
                        },
                        paid: {
                            page: 1,
                            limit: 2,
                            totalPages: 2,
                            hasNextPage: true,
                            hasPreviousPage: false
                        }
                    },
                    active: [{ id: 'active-page-item' }],
                    paid: [{ id: 'paid-page-item' }]
                });
            }
        );
    });

    it('usa la primera página y representa un historial vacío', async () => {
        await withStubs(
            debtRepository,
            {
                findHistoryByParticipant: async (userId, query) => {
                    assert.equal(userId, 'user-1');
                    assert.equal(query.page, 1);
                    assert.equal(query.limit, 20);
                    return [];
                },
                countHistoryByParticipant: async () => 0
            },
            async () => {
                const history = await debtService.getDebtHistoryForUser(
                    'user-1'
                );

                assert.deepEqual(history, {
                    count: { total: 0, active: 0, paid: 0 },
                    pagination: {
                        active: {
                            page: 1,
                            limit: 20,
                            totalPages: 0,
                            hasNextPage: false,
                            hasPreviousPage: false
                        },
                        paid: {
                            page: 1,
                            limit: 20,
                            totalPages: 0,
                            hasNextPage: false,
                            hasPreviousPage: false
                        }
                    },
                    active: [],
                    paid: []
                });
            }
        );
    });

    it('crea las deudas dentro de una misma transacción', async () => {
        const { state, transaction, transactionManager } = (
            createTestTransactionManager()
        );
        const service = createService(transactionManager);
        const createdDebts = [];

        await withStubs(
            groupRepository,
            {
                lockActiveById: async (id, options) => {
                    assert.deepEqual(options, { transaction });
                    return {
                        state: true,
                        members: ['creditor', 'debtor']
                    };
                }
            },
            async () => {
                await withStubs(
                    debtRepository,
                    {
                        create: async (data, options) => {
                            assert.deepEqual(options, { transaction });
                            createdDebts.push(data);
                            return data;
                        }
                    },
                    async () => {
                        const debts = await service.createDebt(
                            {
                                description: 'Cena',
                                value: 50,
                                group: 'group-1',
                                debtor: ['debtor']
                            },
                            { userId: 'creditor' }
                        );

                        assert.equal(debts.length, 1);
                    }
                );
            }
        );

        assert.equal(state.committed, true);
        assert.equal(createdDebts.length, 1);
    });

    it('elimina una deuda sin modificar documentos de usuario', async () => {
        const { state, transaction, transactionManager } = (
            createTestTransactionManager()
        );
        const service = createService(transactionManager);
        await withStubs(
            debtRepository,
            {
                findById: async (id, options) => {
                    assert.deepEqual(options, { transaction });
                    return {
                        creditor: 'creditor',
                        debtor: ['debtor'],
                        value: 30,
                        state: true
                    };
                },
                deleteById: async (id, options) => {
                    assert.deepEqual(options, { transaction });
                    return { _id: id };
                }
            },
            async () => {
                await service.deleteDebt('debt-1', 'creditor');
            }
        );

        assert.equal(state.committed, true);
    });

    it('marca una deuda como pagada con el mismo contexto', async () => {
        const { state, transaction, transactionManager } = (
            createTestTransactionManager()
        );
        const service = createService(transactionManager);

        await withStubs(
            debtRepository,
            {
                findById: async (id, options) => {
                    assert.deepEqual(options, { transaction });
                    return {
                        creditor: 'creditor',
                        debtor: ['debtor'],
                        value: 25,
                        state: true
                    };
                },
                updateById: async (id, data, options) => {
                    assert.deepEqual(options, { transaction });
                    return { _id: id, ...data };
                }
            },
            async () => {
                const paidDebt = await service.markAsPaid(
                    'debt-1',
                    'debtor'
                );

                assert.equal(paidDebt.state, false);
            }
        );

        assert.equal(state.committed, true);
    });

    it('aborta la transacción cuando falla la creación de una deuda', async () => {
        const { state, transactionManager } = createTestTransactionManager();
        const service = createService(transactionManager);

        await withStubs(
            groupRepository,
            {
                lockActiveById: async () => ({
                    state: true,
                    members: ['creditor', 'debtor-1', 'debtor-2']
                })
            },
            async () => {
                let attempts = 0;
                await withStubs(
                    debtRepository,
                    {
                        create: async data => {
                            attempts += 1;
                            if (attempts === 2) {
                                throw new Error('Fallo simulado');
                            }
                            return data;
                        }
                    },
                    async () => {
                        await assert.rejects(
                            () => service.createDebt(
                                {
                                    description: 'Cena',
                                    value: 50,
                                    group: 'group-1',
                                    debtor: ['debtor-1', 'debtor-2']
                                },
                                { userId: 'creditor' }
                            ),
                            /Fallo simulado/
                        );
                    }
                );
            }
        );

        assert.equal(state.aborted, true);
        assert.equal(state.committed, false);
    });
});
