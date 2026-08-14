const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createCompositionRoot } = require('../../src/compositionRoot');
const {
    createTestAppConfig
} = require('../fixtures/appConfig');

const createInjectedDependencies = () => {
    const calls = [];
    const userRepository = {
        async findActiveById(id) {
            calls.push(['findActiveById', id]);
            return { _id: id, nickname: 'usuario', state: true };
        },
        async findByEmail(email) {
            calls.push(['findByEmail', email]);
            return {
                _id: 'user-1',
                nickname: 'usuario',
                password: 'hash',
                state: true
            };
        }
    };
    const debtRepository = {
        async getActiveBalanceByUserId(id) {
            calls.push(['getActiveBalanceByUserId', id]);
            return { owe: 15, owes: 40 };
        }
    };
    const passwordHasher = {
        async compare(password, hash) {
            calls.push(['compare', password, hash]);
            return true;
        },
        async genSalt() {
            return 'salt';
        },
        async hash(password) {
            return `hashed:${password}`;
        }
    };
    const tokenProvider = {
        sign(payload, secret, options) {
            calls.push(['sign', payload, secret, options]);
            return 'injected-token';
        },
        verify(token, secret) {
            calls.push(['verify', token, secret]);
            return { userId: 'user-1', nick: 'token-nick' };
        }
    };

    const root = createCompositionRoot({
        repositories: {
            user: userRepository,
            group: {},
            debt: debtRepository
        },
        infrastructure: {
            config: createTestAppConfig(),
            generateRandomCode: () => 'ABC123',
            getJwtSecret: () => 'injected-secret',
            passwordHasher,
            tokenProvider,
            transactionManager: {
                runInTransaction: work => work({ id: 'transaction-1' })
            }
        }
    });

    return { calls, root };
};

describe('composition root e inyección de dependencias', () => {
    it('propaga la configuración validada como infraestructura', () => {
        const config = createTestAppConfig();
        const root = createCompositionRoot({
            infrastructure: { config }
        });

        assert.equal(root.infrastructure.config, config);
        assert.equal(
            root.infrastructure.getJwtSecret(),
            config.auth.jwtSecret
        );
        assert.equal(
            root.infrastructure.httpSecurityConfig,
            config.httpSecurity
        );
    });

    it('construye servicios con repositorios y proveedores inyectados', async () => {
        const { calls, root } = createInjectedDependencies();

        const user = await root.services.user.getUserById(
            'user-1',
            'user-1'
        );
        const token = await root.services.auth.login(
            'user@example.com',
            'password'
        );

        assert.equal(user.uid, 'user-1');
        assert.equal(user.owe, 15);
        assert.equal(user.owes, 40);
        assert.equal(token, 'injected-token');
        assert.deepEqual(calls, [
            ['findActiveById', 'user-1'],
            ['getActiveBalanceByUserId', 'user-1'],
            ['findByEmail', 'user@example.com'],
            ['compare', 'password', 'hash'],
            [
                'sign',
                { userId: 'user-1', nick: 'usuario' },
                'injected-secret',
                { expiresIn: '4h' }
            ]
        ]);
    });

    it('inyecta el administrador de transacciones en los casos de uso', async () => {
        const transaction = { id: 'transaction-1' };
        const calls = [];
        const transactionManager = {
            async runInTransaction(work) {
                calls.push('runInTransaction');
                return work(transaction);
            }
        };
        const root = createCompositionRoot({
            infrastructure: {
                config: createTestAppConfig(),
                transactionManager
            },
            repositories: {
                debt: {
                    async create(data, options) {
                        assert.deepEqual(options, { transaction });
                        return data;
                    }
                },
                group: {
                    async findActiveById(id, options) {
                        assert.deepEqual(options, { transaction });
                        return {
                            state: true,
                            members: ['creditor', 'debtor']
                        };
                    }
                },
                user: {}
            },
        });

        const result = await root.services.debt.createDebt(
            {
                description: 'Cena',
                value: 20,
                group: 'group-1',
                debtor: ['debtor']
            },
            { userId: 'creditor' }
        );

        assert.equal(
            root.infrastructure.transactionManager,
            transactionManager
        );
        assert.equal(result.length, 1);
        assert.deepEqual(calls, ['runInTransaction']);
    });

    it('inyecta deudas y transacciones en la desactivación de grupos', async () => {
        const transaction = { id: 'group-transaction' };
        const calls = [];
        const root = createCompositionRoot({
            infrastructure: {
                config: createTestAppConfig(),
                transactionManager: {
                    async runInTransaction(work) {
                        calls.push(['runInTransaction']);
                        return work(transaction);
                    }
                }
            },
            repositories: {
                debt: {
                    async existsActiveByGroup(id, options) {
                        calls.push(['existsActiveByGroup', id, options]);
                        return false;
                    }
                },
                group: {
                    async deactivateById(id, options) {
                        calls.push(['deactivateById', id, options]);
                        return { _id: id, state: false };
                    },
                    async findActiveById(id, options) {
                        calls.push(['findActiveById', id, options]);
                        return { _id: id, admin: 'admin-1' };
                    }
                },
                user: {}
            }
        });

        const result = await root.services.group.deleteGroup(
            'group-1',
            'admin-1'
        );

        assert.deepEqual(result, { _id: 'group-1', state: false });
        assert.deepEqual(calls, [
            ['runInTransaction'],
            ['findActiveById', 'group-1', { transaction }],
            ['existsActiveByGroup', 'group-1', { transaction }],
            ['deactivateById', 'group-1', { transaction }]
        ]);
    });

    it('inyecta JWT y repositorio en el middleware de autenticación', async () => {
        const { calls, root } = createInjectedDependencies();
        const req = {
            header: () => 'Bearer raw-token'
        };
        let nextError;

        await root.middleware.authVerify(req, {}, error => {
            nextError = error;
        });

        assert.equal(nextError, undefined);
        assert.equal(req.user.userId, 'user-1');
        assert.equal(req.user.nick, 'usuario');
        assert.deepEqual(calls, [
            ['verify', 'raw-token', 'injected-secret'],
            ['findActiveById', 'user-1']
        ]);
    });

    it('propaga un servicio sustituido hasta el controlador y router v2', async () => {
        const calls = [];
        const injectedUserService = {
            async getUserByToken(user) {
                calls.push(user.userId);
                return { uid: user.userId };
            }
        };
        const root = createCompositionRoot({
            infrastructure: { config: createTestAppConfig() },
            services: { user: injectedUserService }
        });
        const result = {};
        const res = {
            status(statusCode) {
                result.statusCode = statusCode;
                return this;
            },
            json(body) {
                result.body = body;
                return this;
            }
        };

        await root.controllers.v2.user.getUserByToken(
            { user: { userId: 'injected-user' } },
            res,
            error => {
                throw error;
            }
        );

        assert.deepEqual(calls, ['injected-user']);
        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.body, {
            success: true,
            data: { id: 'injected-user' }
        });
        assert.ok(root.routers.v2.user.stack.length > 0);
        assert.deepEqual(Object.keys(root.controllers), ['v2']);
        assert.deepEqual(Object.keys(root.routers), ['v2']);
        assert.equal('legacyApi' in root.middleware, false);
    });

    it('construye v2 con los mismos servicios y un contrato uniforme', async () => {
        const calls = [];
        const root = createCompositionRoot({
            infrastructure: { config: createTestAppConfig() },
            services: {
                user: {
                    async getUserByToken(user) {
                        calls.push(user.userId);
                        return {
                            uid: user.userId,
                            name: 'Usuario',
                            nickname: 'usuario',
                            owe: 0,
                            owes: 0
                        };
                    }
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

        await root.controllers.v2.user.getUserByToken(
            { user: { userId: 'user-v2' } },
            response,
            error => { throw error; }
        );

        assert.deepEqual(calls, ['user-v2']);
        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.body, {
            success: true,
            data: {
                id: 'user-v2',
                name: 'Usuario',
                nickname: 'usuario',
                owe: 0,
                owes: 0
            }
        });
        assert.ok(root.routers.v2.user.stack.length > 0);
        assert.ok(root.routers.v2.group.stack.length > 0);
        assert.ok(root.routers.v2.auth.stack.length > 0);
        assert.ok(root.routers.v2.debt.stack.length > 0);
    });
});
