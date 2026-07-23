const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
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
    it('impide consultar el perfil de otro usuario', async () => {
        await assert.rejects(
            () => userService.getUserById('user-2', 'user-1'),
            error => error.statusCode === 403
        );
    });

    it('permite consultar el perfil propio', async () => {
        const expectedUser = { _id: 'user-1', name: 'Usuario' };

        await withRepositoryStubs(
            { getUserById: async () => expectedUser },
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
                getUserById: async () => ({ _id: 'user-1' }),
                updateUser: async (id, data) => {
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
                getUserById: async (id, receivedSession) => {
                    assert.equal(receivedSession, session);
                    return { _id: id };
                },
                updateUser: async (id, data, receivedSession) => {
                    persistedUpdate = { id, data, session: receivedSession };
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
            session
        });
    });
});
