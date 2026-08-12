const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createUserController
} = require('../../src/controllers/factories/createUserController');

describe('userController: búsqueda paginada', () => {
    it('propaga la query validada y conserva results en la respuesta', async () => {
        const calls = [];
        const controller = createUserController({
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
                        results: [{ nickname: 'leon' }]
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
        }, response);

        assert.deepEqual(calls, [['leo', { page: 2, limit: 10 }]]);
        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.body, {
            msg: "Resultados de la búsqueda para 'leo'",
            count: 1,
            pagination: {
                page: 2,
                limit: 10,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: true
            },
            results: [{ nickname: 'leon' }]
        });
    });
});
