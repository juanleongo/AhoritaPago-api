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
