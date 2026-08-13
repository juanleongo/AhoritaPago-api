const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const groupRepository = require('../../src/repositories/group');
const userRepository = require('../../src/repositories/user');
const { generateRandomCode } = require('../../src/helpers/codeGenerator');
const {
    createGroupService
} = require('../../src/services/factories/createGroupService');

const groupService = createGroupService({
    generateRandomCode,
    groupRepository,
    userRepository
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

const buildGroup = () => ({
    _id: 'group-1',
    admin: 'admin',
    members: ['admin', 'member'],
    name: 'Amigos'
});

describe('groupService: membresía y administración', () => {
    it('permite consultar un grupo a sus integrantes', async () => {
        await withStubs(
            groupRepository,
            { findActiveById: async () => buildGroup() },
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
            { findActiveById: async () => buildGroup() },
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
                findActiveById: async () => buildGroup(),
                updateById: async (id, data) => {
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
        let persistedMember;
        const updatedGroup = {
            ...group,
            members: [...group.members, 'new-member']
        };

        await withStubs(
            groupRepository,
            {
                findActiveByCode: async () => group,
                addMemberById: async (groupId, userId) => {
                    persistedMember = { groupId, userId };
                    return updatedGroup;
                }
            },
            async () => {
                await withStubs(
                    userRepository,
                    {
                        findActiveByNickname: async () => ({
                            _id: 'new-member',
                            nickname: 'nuevo'
                        })
                    },
                    async () => {
                        const result = await groupService.addMemberToGroup(
                            'CODE',
                            'nuevo',
                            'member'
                        );
                        assert.equal(result, updatedGroup);
                    }
                );
            }
        );

        assert.deepEqual(persistedMember, {
            groupId: 'group-1',
            userId: 'new-member'
        });
    });

    it('impide agregar miembros a un usuario externo al grupo', async () => {
        await withStubs(
            groupRepository,
            { findActiveByCode: async () => buildGroup() },
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
