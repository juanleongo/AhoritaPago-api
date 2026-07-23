const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const groupRepository = require('../../src/repositories/group');
const userRepository = require('../../src/repositories/user');
const groupService = require('../../src/services/groupService');

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

const buildGroup = () => ({
    _id: 'group-1',
    admin: 'admin',
    members: ['admin', 'member'],
    name: 'Amigos',
    async save() {}
});

describe('groupService: membresía y administración', () => {
    it('permite consultar un grupo a sus integrantes', async () => {
        await withStubs(
            groupRepository,
            { getGroupyId: async () => buildGroup() },
            async () => {
                const group = await groupService.getGroupById(
                    'group-1',
                    'member'
                );

                assert.equal(group.name, 'Amigos');
            }
        );
    });

    it('rechaza la consulta de un usuario externo', async () => {
        await withStubs(
            groupRepository,
            { getGroupyId: async () => buildGroup() },
            async () => {
                await assert.rejects(
                    () => groupService.getGroupById('group-1', 'outsider'),
                    error => error.statusCode === 403
                );
            }
        );
    });

    it('solo permite al administrador modificar el grupo', async () => {
        let updatedData;

        await withStubs(
            groupRepository,
            {
                getGroupyId: async () => buildGroup(),
                updateGroup: async (id, data) => {
                    updatedData = { id, data };
                    return updatedData;
                }
            },
            async () => {
                await assert.rejects(
                    () => groupService.updateGroup(
                        'group-1',
                        { name: 'Otro nombre' },
                        'member'
                    ),
                    error => error.statusCode === 403
                );

                await groupService.updateGroup(
                    'group-1',
                    { name: 'Nuevo nombre', admin: 'attacker' },
                    'admin'
                );
            }
        );

        assert.deepEqual(updatedData, {
            id: 'group-1',
            data: { name: 'Nuevo nombre' }
        });
    });

    it('permite a cualquier integrante agregar una persona', async () => {
        const group = buildGroup();
        let saved = false;
        group.save = async () => {
            saved = true;
        };

        await withStubs(
            groupRepository,
            { getGroupByCode: async () => group },
            async () => {
                await withStubs(
                    userRepository,
                    {
                        getUserByNickName: async () => ({
                            _id: 'new-member',
                            nickname: 'nuevo'
                        })
                    },
                    async () => {
                        await groupService.addMemberToGroup(
                            'CODE',
                            'nuevo',
                            'member'
                        );
                    }
                );
            }
        );

        assert.equal(saved, true);
        assert.ok(group.members.includes('new-member'));
    });

    it('impide agregar miembros a un usuario externo al grupo', async () => {
        await withStubs(
            groupRepository,
            { getGroupByCode: async () => buildGroup() },
            async () => {
                await assert.rejects(
                    () => groupService.addMemberToGroup(
                        'CODE',
                        'nuevo',
                        'outsider'
                    ),
                    error => error.statusCode === 403
                );
            }
        );
    });
});
