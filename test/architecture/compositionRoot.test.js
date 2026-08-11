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
            debt: {}
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

        assert.equal(user._id, 'user-1');
        assert.equal(token, 'injected-token');
        assert.deepEqual(calls, [
            ['findActiveById', 'user-1'],
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
            services: {
                user: {
                    async incrementUserBalances(id, changes, context) {
                        assert.equal(context, transaction);
                    }
                }
            }
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

    it('propaga un servicio sustituido hasta su controlador y router', async () => {
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

        await root.controllers.user.getUserByToken(
            { user: { userId: 'injected-user' } },
            res,
            error => {
                throw error;
            }
        );

        assert.deepEqual(calls, ['injected-user']);
        assert.equal(result.statusCode, 200);
        assert.deepEqual(result.body, { uid: 'injected-user' });
        assert.ok(root.routers.user.stack.length > 0);
    });
});
