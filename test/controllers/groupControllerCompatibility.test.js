const { it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createGroupController
} = require('../../src/controllers/factories/createGroupController');

it('conserva la respuesta legacy al agregar un integrante', async () => {
    const group = { _id: 'group-1', name: 'Amigos' };
    const controller = createGroupController({
        groupService: {
            async addMemberToGroup() {
                return group;
            }
        }
    });
    const result = {};
    const response = {
        status(statusCode) {
            result.statusCode = statusCode;
            return this;
        },
        json(body) {
            result.body = body;
            return this;
        }
    };

    await controller.addMember({
        user: { userId: 'user-1' },
        validated: {
            body: { groupCode: 'ABC123', userNick: 'laura' }
        }
    }, response, error => { throw error; });

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, {
        message: 'Usuario agregado al grupo exitosamente',
        group
    });
});

it('conserva el arreglo legacy de grupos y publica headers de página', async () => {
    const groups = [{ _id: 'group-1', name: 'Amigos' }];
    const controller = createGroupController({
        groupService: {
            async getGroupsForUser(userId, pagination) {
                assert.equal(userId, 'user-1');
                assert.deepEqual(pagination, { page: 2, limit: 10 });
                return {
                    count: 23,
                    pagination: {
                        page: 2,
                        limit: 10,
                        totalPages: 3,
                        hasNextPage: true,
                        hasPreviousPage: true
                    },
                    groups
                };
            }
        }
    });
    const result = { headers: {} };
    const response = {
        set(headers) {
            Object.assign(result.headers, headers);
            return this;
        },
        status(statusCode) {
            result.statusCode = statusCode;
            return this;
        },
        json(body) {
            result.body = body;
            return this;
        }
    };

    await controller.getGroupsForUser({
        user: { userId: 'user-1' },
        validated: { query: { page: 2, limit: 10 } }
    }, response, error => { throw error; });

    assert.deepEqual(result.body, groups);
    assert.equal(result.headers['X-Total-Count'], '23');
    assert.equal(result.headers['X-Page'], '2');
});
