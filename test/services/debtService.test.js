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
    it('divide y ordena el historial desde la fecha más reciente', async () => {
        await withStubs(
            debtRepository,
            {
                findDebtHistoryByUserId: async userId => {
                    assert.equal(userId, 'user-1');
                    return [
                        {
                            id: 'active-old',
                            state: true,
                            debtDate: new Date('2026-01-10')
                        },
                        {
                            id: 'paid-old',
                            state: false,
                            debtDate: new Date('2026-01-01'),
                            paymentDate: new Date('2026-02-15')
                        },
                        {
                            id: 'active-new',
                            state: true,
                            debtDate: new Date('2026-05-20')
                        },
                        {
                            id: 'paid-new',
                            state: false,
                            debtDate: new Date('2026-03-01'),
                            paymentDate: new Date('2026-06-30')
                        }
                    ];
                }
            },
            async () => {
                const history = await debtService.getDebtHistoryForUser(
                    'user-1'
                );

                assert.deepEqual(
                    history.active.map(debt => debt.id),
                    ['active-new', 'active-old']
                );
                assert.deepEqual(
                    history.paid.map(debt => debt.id),
                    ['paid-new', 'paid-old']
                );
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
                        getGroupyId: async (id, receivedSession) => {
                            assert.equal(receivedSession, session);
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
                                createDebt: async (data, receivedSession) => {
                                    assert.equal(receivedSession, session);
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
                        getDebtById: async () => ({
                            creditor: 'creditor',
                            debtor: ['debtor'],
                            value: 30,
                            state: true
                        }),
                        deleteDebt: async (id, receivedSession) => {
                            assert.equal(receivedSession, session);
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
                        getGroupyId: async () => ({
                            state: true,
                            members: ['creditor', 'debtor']
                        })
                    },
                    async () => {
                        await withStubs(
                            debtRepository,
                            { createDebt: async data => data },
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
