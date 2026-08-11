const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const debtRepository = require('../../src/repositories/debt');
const groupRepository = require('../../src/repositories/group');
const userService = require('../../src/services/userService');
const debtService = require('../../src/services/debtservice');

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

const createSession = () => ({
    committed: false,
    aborted: false,
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

describe('debtService: historial y consistencia financiera', () => {
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

    it('crea deuda y saldos dentro de la misma transacción', async () => {
        const session = createSession();
        const balanceUpdates = [];

        await withStubs(
            mongoose,
            { startSession: async () => session },
            async () => {
                await withStubs(
                    groupRepository,
                    {
                        findActiveById: async (id, options) => {
                            assert.deepEqual(options, { session });
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
                                    assert.deepEqual(options, { session });
                                    return data;
                                }
                            },
                            async () => {
                                await withStubs(
                                    userService,
                                    {
                                        incrementUserBalances: async (
                                            id,
                                            changes,
                                            receivedSession
                                        ) => {
                                            assert.equal(
                                                receivedSession,
                                                session
                                            );
                                            balanceUpdates.push({
                                                id,
                                                changes
                                            });
                                        }
                                    },
                                    async () => {
                                        const debts = await debtService.createDebt(
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
                    }
                );
            }
        );

        assert.equal(session.committed, true);
        assert.equal(session.ended, true);
        assert.deepEqual(balanceUpdates, [
            { id: 'debtor', changes: { owe: 50 } },
            { id: 'creditor', changes: { owes: 50 } }
        ]);
    });

    it('revierte saldos al eliminar una deuda activa', async () => {
        const session = createSession();
        const balanceUpdates = [];

        await withStubs(
            mongoose,
            { startSession: async () => session },
            async () => {
                await withStubs(
                    debtRepository,
                    {
                        findById: async (id, options) => {
                            assert.deepEqual(options, { session });
                            return {
                            creditor: 'creditor',
                            debtor: ['debtor'],
                            value: 30,
                            state: true
                            };
                        },
                        deleteById: async (id, options) => {
                            assert.deepEqual(options, { session });
                            return { _id: id };
                        }
                    },
                    async () => {
                        await withStubs(
                            userService,
                            {
                                incrementUserBalances: async (
                                    id,
                                    changes,
                                    receivedSession
                                ) => {
                                    assert.equal(receivedSession, session);
                                    balanceUpdates.push({ id, changes });
                                }
                            },
                            async () => {
                                await debtService.deleteDebt(
                                    'debt-1',
                                    'creditor'
                                );
                            }
                        );
                    }
                );
            }
        );

        assert.equal(session.committed, true);
        assert.equal(session.ended, true);
        assert.deepEqual(balanceUpdates, [
            { id: 'creditor', changes: { owes: -30 } },
            { id: 'debtor', changes: { owe: -30 } }
        ]);
    });

    it('aborta la transacción cuando falla una operación financiera', async () => {
        const session = createSession();

        await withStubs(
            mongoose,
            { startSession: async () => session },
            async () => {
                await withStubs(
                    groupRepository,
                    {
                        findActiveById: async () => ({
                            state: true,
                            members: ['creditor', 'debtor']
                        })
                    },
                    async () => {
                        await withStubs(
                            debtRepository,
                            { create: async data => data },
                            async () => {
                                await withStubs(
                                    userService,
                                    {
                                        incrementUserBalances: async () => {
                                            throw new Error('Fallo simulado');
                                        }
                                    },
                                    async () => {
                                        await assert.rejects(
                                            () => debtService.createDebt(
                                                {
                                                    description: 'Cena',
                                                    value: 50,
                                                    group: 'group-1',
                                                    debtor: ['debtor']
                                                },
                                                { userId: 'creditor' }
                                            ),
                                            /Fallo simulado/
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );

        assert.equal(session.aborted, true);
        assert.equal(session.ended, true);
    });
});
