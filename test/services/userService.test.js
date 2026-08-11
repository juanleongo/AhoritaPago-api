const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bcryptjs = require('bcryptjs');
const userRepository = require('../../src/repositories/user');
const userService = require('../../src/services/userService');

const withRepositoryStubs = async (stubs, work) => {
    const originals = {};

    Object.entries(stubs).forEach(([name, implementation]) => {
        originals[name] = userRepository[name];
        userRepository[name] = implementation;
    });

    try {
        return await work();
    } finally {
        Object.entries(originals).forEach(([name, implementation]) => {
            userRepository[name] = implementation;
        });
    }
};

describe('userService: autorización y campos permitidos', () => {
    it('pagina la búsqueda por nickname y devuelve el total', async () => {
        const calls = [];

        await withRepositoryStubs(
            {
                searchActiveByNickname: async (term, pagination) => {
                    calls.push(['search', term, pagination]);
                    return [{ nickname: 'leon' }];
                },
                countActiveByNickname: async term => {
                    calls.push(['count', term]);
                    return 21;
                }
            },
            async () => {
                const result = await userService.searchUsersByNickname(
                    'leo',
                    { page: 2, limit: 10 }
                );

                assert.deepEqual(calls, [
                    ['search', 'leo', { page: 2, limit: 10 }],
                    ['count', 'leo']
                ]);
                assert.deepEqual(result, {
                    count: 21,
                    pagination: {
                        page: 2,
                        limit: 10,
                        totalPages: 3,
                        hasNextPage: true,
                        hasPreviousPage: true
                    },
                    results: [{ nickname: 'leon' }]
                });
            }
        );
    });

    it('el registro descarta campos internos y cifra la contraseña', async () => {
        let persistedData;

        await withRepositoryStubs(
            {
                findByEmail: async () => null,
                findByNickname: async () => null,
                create: async data => {
                    persistedData = data;
                    return data;
                }
            },
            async () => {
                await userService.createUser({
                    name: 'Usuario',
                    email: 'user@example.com',
                    nickname: 'usuario',
                    password: 'password-seguro',
                    owe: 999999,
                    owes: 999999,
                    state: false,
                    google: 'attacker'
                });
            }
        );

        assert.deepEqual(
            Object.keys(persistedData).sort(),
            ['email', 'name', 'nickname', 'password']
        );
        assert.notEqual(persistedData.password, 'password-seguro');
        assert.equal(
            await bcryptjs.compare('password-seguro', persistedData.password),
            true
        );
    });

    it('impide consultar el perfil de otro usuario', async () => {
        await assert.rejects(
            () => userService.getUserById('user-2', 'user-1'),
            error => error.statusCode === 403
        );
    });

    it('permite consultar el perfil propio', async () => {
        const expectedUser = { _id: 'user-1', name: 'Usuario' };

        await withRepositoryStubs(
            { findActiveById: async () => expectedUser },
            async () => {
                const user = await userService.getUserById('user-1', 'user-1');
                assert.equal(user, expectedUser);
            }
        );
    });

    it('elimina campos sensibles de una actualización de perfil', async () => {
        let persistedData;

        await withRepositoryStubs(
            {
                findActiveById: async () => ({ _id: 'user-1' }),
                updateById: async (id, data) => {
                    persistedData = { id, data };
                    return persistedData;
                }
            },
            async () => {
                await userService.updateUser(
                    'user-1',
                    {
                        name: 'Nuevo nombre',
                        owe: 0,
                        owes: 999999,
                        state: false,
                        password: 'sin-cifrar'
                    },
                    'user-1'
                );
            }
        );

        assert.deepEqual(persistedData, {
            id: 'user-1',
            data: { name: 'Nuevo nombre' }
        });
    });

    it('solo permite incrementos internos de owe y owes', async () => {
        const session = { id: 'session-1' };
        let persistedUpdate;

        await withRepositoryStubs(
            {
                findActiveById: async (id, options) => {
                    assert.deepEqual(options, { session });
                    return { _id: id };
                },
                updateById: async (id, data, options) => {
                    persistedUpdate = { id, data, options };
                    return persistedUpdate;
                }
            },
            async () => {
                await userService.incrementUserBalances(
                    'user-1',
                    { owe: 20, state: 1 },
                    session
                );
            }
        );

        assert.deepEqual(persistedUpdate, {
            id: 'user-1',
            data: { $inc: { owe: 20 } },
            options: { session }
        });
    });
});
