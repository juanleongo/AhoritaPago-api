const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createAuthControllerV2
} = require('../../src/controllers/v2/createAuthController');
const {
    createDebtControllerV2
} = require('../../src/controllers/v2/createDebtController');
const {
    createGroupControllerV2
} = require('../../src/controllers/v2/createGroupController');
const {
    createUserControllerV2
} = require('../../src/controllers/v2/createUserController');

const invoke = async (handler, request) => {
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
    let propagatedError;

    await handler(request, response, error => {
        propagatedError = error;
    });

    if (propagatedError) {
        throw propagatedError;
    }

    return result;
};

const assertEnvelope = result => {
    assert.ok([200, 201].includes(result.statusCode));
    assert.equal(result.body.success, true);
    assert.equal(Object.prototype.hasOwnProperty.call(result.body, 'data'), true);
    assert.equal('msg' in result.body, false);
};

const baseRequest = changes => ({
    user: { userId: 'user-1' },
    validated: {
        body: {},
        params: { id: 'resource-1', groupCode: 'ABC123' },
        query: {}
    },
    ...changes
});

describe('contrato uniforme de controladores v2', () => {
    it('envuelve la autenticación dentro de data', async () => {
        const controller = createAuthControllerV2({
            authService: {
                async login() {
                    return 'jwt-token';
                }
            }
        });
        const result = await invoke(controller.login, baseRequest({
            validated: {
                body: { email: 'user@example.com', password: 'secret' }
            }
        }));

        assertEnvelope(result);
        assert.deepEqual(result.body.data, { token: 'jwt-token' });
    });

    it('uniforma todos los endpoints de usuario', async () => {
        const user = {
            uid: 'user-1',
            name: 'Laura',
            nickname: 'laura',
            email: 'laura@example.com',
            state: true,
            owe: 10,
            owes: 20
        };
        let receivedNickname;
        const controller = createUserControllerV2({
            userService: {
                async createUser() { return user; },
                async deleteUser() {},
                async getByNickname(nickname) {
                    receivedNickname = nickname;
                    return user;
                },
                async getUserById() { return user; },
                async getUserByToken() { return user; },
                async searchUsersByNickname() {
                    return {
                        count: 1,
                        pagination: { page: 1, limit: 20, totalPages: 1 },
                        results: [user]
                    };
                },
                async updateUser() { return user; }
            }
        });
        const requests = {
            createUser: baseRequest({
                validated: { body: user, params: {}, query: {} }
            }),
            deleteUser: baseRequest(),
            getByNickname: baseRequest({
                body: undefined,
                validated: {
                    body: {},
                    params: { nickname: 'laura' },
                    query: {}
                }
            }),
            getUserById: baseRequest(),
            getUserByToken: baseRequest(),
            searchUsers: baseRequest({
                validated: {
                    body: {},
                    params: { searchTerm: 'lau' },
                    query: { page: 1, limit: 20 }
                }
            }),
            updateUser: baseRequest({
                validated: {
                    body: { name: 'Laura' },
                    params: { id: 'user-1' },
                    query: {}
                }
            })
        };

        for (const [name, request] of Object.entries(requests)) {
            assertEnvelope(await invoke(controller[name], request));
        }

        assert.equal(receivedNickname, 'laura');
        const search = await invoke(controller.searchUsers, requests.searchUsers);
        assert.equal(search.body.meta.count, 1);
        assert.equal(search.body.data[0].id, 'user-1');
        const deleted = await invoke(controller.deleteUser, requests.deleteUser);
        assert.equal(deleted.body.data, null);
    });

    it('uniforma todos los endpoints de grupos', async () => {
        const group = {
            _id: 'group-1',
            name: 'Amigos',
            state: true,
            code: 'ABC123',
            admin: 'user-1',
            members: ['user-1']
        };
        const controller = createGroupControllerV2({
            groupService: {
                async addMemberToGroup() { return group; },
                async createGroup() { return group; },
                async deleteGroup() {},
                async getGroupById() { return group; },
                async getGroupsForUser() {
                    return {
                        count: 1,
                        pagination: { page: 1, limit: 20, totalPages: 1 },
                        groups: [group]
                    };
                },
                async updateGroup() { return group; }
            }
        });
        const requests = {
            addMember: baseRequest({
                validated: {
                    body: { groupCode: 'ABC123', userNick: 'laura' },
                    params: {},
                    query: {}
                }
            }),
            createGroup: baseRequest({
                validated: { body: { name: 'Amigos' }, params: {}, query: {} }
            }),
            deleteGroup: baseRequest(),
            getGroupById: baseRequest(),
            getGroupsForUser: baseRequest(),
            updateGroup: baseRequest({
                validated: {
                    body: { name: 'Amigos' },
                    params: { id: 'group-1' },
                    query: {}
                }
            })
        };

        for (const [name, request] of Object.entries(requests)) {
            assertEnvelope(await invoke(controller[name], request));
        }

        const list = await invoke(
            controller.getGroupsForUser,
            requests.getGroupsForUser
        );
        assert.equal(list.body.meta.count, 1);
        assert.ok(Array.isArray(list.body.data));
    });

    it('uniforma todos los endpoints de deudas', async () => {
        const debt = {
            _id: 'debt-1',
            description: 'Cena',
            state: true,
            creditor: 'user-1',
            debtor: ['user-2'],
            value: 50,
            group: 'group-1'
        };
        const controller = createDebtControllerV2({
            debtService: {
                async createDebt() { return [debt]; },
                async deleteDebt() {},
                async getAllDebts() {
                    return {
                        count: 1,
                        pagination: { page: 1, limit: 20, totalPages: 1 },
                        debts: [debt]
                    };
                },
                async getDebtById() { return debt; },
                async getDebtHistoryForUser() {
                    return {
                        active: [debt],
                        paid: [],
                        count: { total: 1, active: 1, paid: 0 },
                        pagination: { active: {}, paid: {} }
                    };
                },
                async getDebtSummaryForUser() {
                    return {
                        debts: [],
                        credits: [],
                        count: { total: 0, debts: 0, credits: 0 },
                        pagination: { debts: {}, credits: {} }
                    };
                },
                async getDebtsForUserInGroupByCode() {
                    return {
                        count: 1,
                        pagination: { page: 1, limit: 20, totalPages: 1 },
                        debts: [debt]
                    };
                },
                async markAsPaid() { return { ...debt, state: false }; },
                async updateDebt() { return debt; }
            }
        });
        const requests = {
            createDebt: baseRequest({
                validated: {
                    body: {
                        description: 'Cena',
                        value: 50,
                        group: 'group-1',
                        debtor: ['user-2']
                    },
                    params: {},
                    query: {}
                }
            }),
            deleteDebt: baseRequest(),
            getAllDebts: baseRequest(),
            getDebtById: baseRequest(),
            getDebtHistory: baseRequest(),
            getDebtSummary: baseRequest(),
            getDebtsInGroup: baseRequest(),
            markAsPay: baseRequest(),
            updateDebt: baseRequest({
                validated: {
                    body: { description: 'Cena' },
                    params: { id: 'debt-1' },
                    query: {}
                }
            })
        };

        for (const [name, request] of Object.entries(requests)) {
            assertEnvelope(await invoke(controller[name], request));
        }

        const history = await invoke(
            controller.getDebtHistory,
            requests.getDebtHistory
        );
        assert.deepEqual(Object.keys(history.body.data), ['active', 'paid']);
        assert.equal(history.body.meta.count.total, 1);
        const activeDebts = await invoke(
            controller.getAllDebts,
            requests.getAllDebts
        );
        assert.equal(activeDebts.body.meta.count, 1);
        assert.equal(activeDebts.body.meta.pagination.page, 1);
        const summary = await invoke(
            controller.getDebtSummary,
            requests.getDebtSummary
        );
        assert.equal(summary.body.meta.count.total, 0);
        const groupDebts = await invoke(
            controller.getDebtsInGroup,
            requests.getDebtsInGroup
        );
        assert.equal(groupDebts.body.meta.pagination.limit, 20);
        const deleted = await invoke(controller.deleteDebt, requests.deleteDebt);
        assert.equal(deleted.body.data, null);
    });
});
