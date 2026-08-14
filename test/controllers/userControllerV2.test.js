const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createUserControllerV2
} = require('../../src/controllers/v2/createUserController');

describe('userController v2: búsqueda paginada', () => {
    it('propaga la query validada y responde con data y meta', async () => {
        const calls = [];
        const controller = createUserControllerV2({
            userService: {
                async searchUsersByNickname(searchTerm, pagination) {
                    calls.push([searchTerm, pagination]);
                    return {
                        count: 1,
                        pagination: {
                            page: 2,
                            limit: 10,
                            totalPages: 1,
                            hasNextPage: false,
                            hasPreviousPage: true
                        },
                        results: [{
                            uid: 'user-1',
                            name: 'Leon',
                            nickname: 'leon'
                        }]
                    };
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

        await controller.searchUsers({
            validated: {
                params: { searchTerm: 'leo' },
                query: { page: 2, limit: 10 }
            }
        }, response, error => { throw error; });

        assert.deepEqual(calls, [['leo', { page: 2, limit: 10 }]]);
        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.body, {
            success: true,
            data: [{ id: 'user-1', name: 'Leon', nickname: 'leon' }],
            meta: {
                count: 1,
                pagination: {
                    page: 2,
                    limit: 10,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: true
                }
            }
        });
    });
});
