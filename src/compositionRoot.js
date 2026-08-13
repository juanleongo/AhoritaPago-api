const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('./repositories/user');
const groupRepository = require('./repositories/group');
const debtRepository = require('./repositories/debt');
const { generateRandomCode } = require('./helpers/codeGenerator');
const { createUserService } = require('./services/factories/createUserService');
const { createGroupService } = require('./services/factories/createGroupService');
const { createAuthService } = require('./services/factories/createAuthService');
const {
    createBalanceService
} = require('./services/balance/createBalanceService');
const { createDebtService } = require('./services/debt/createDebtService');
const {
    createAuthVerify
} = require('./middlewares/factories/createAuthVerify');
const {
    createHttpSecurity
} = require('./middlewares/factories/createHttpSecurity');
const {
    createDeprecateEndpoint,
    createLegacySuccessorResolver
} = require('./middlewares/deprecateEndpoint');
const {
    createUserController
} = require('./controllers/factories/createUserController');
const {
    createGroupController
} = require('./controllers/factories/createGroupController');
const {
    createAuthController
} = require('./controllers/factories/createAuthController');
const {
    createDebtController
} = require('./controllers/factories/createDebtController');
const {
    createAuthControllerV2
} = require('./controllers/v2/createAuthController');
const {
    createDebtControllerV2
} = require('./controllers/v2/createDebtController');
const {
    createGroupControllerV2
} = require('./controllers/v2/createGroupController');
const {
    createUserControllerV2
} = require('./controllers/v2/createUserController');
const {
    createUserRouter
} = require('./routes/factories/createUserRouter');
const {
    createGroupRouter
} = require('./routes/factories/createGroupRouter');
const {
    createAuthRouter
} = require('./routes/factories/createAuthRouter');
const {
    createDebtRouter
} = require('./routes/factories/createDebtRouter');
const {
    createUserRouterV2
} = require('./routes/v2/createUserRouter');
const { createAppConfig } = require('./config/appConfig');
const {
    createMongooseTransactionManager
} = require('./adapters/mongooseTransactionManager');

const createCompositionRoot = (overrides = {}) => {
    const config = (
        overrides.infrastructure?.config
        || createAppConfig(overrides.env)
    );
    const repositories = {
        user: overrides.repositories?.user || userRepository,
        group: overrides.repositories?.group || groupRepository,
        debt: overrides.repositories?.debt || debtRepository
    };
    const transactionManager = (
        overrides.infrastructure?.transactionManager
        || createMongooseTransactionManager()
    );

    const infrastructure = {
        config,
        apiLifecycleConfig: (
            overrides.infrastructure?.apiLifecycleConfig
            || config.apiLifecycle
        ),
        passwordHasher: (
            overrides.infrastructure?.passwordHasher || bcrypt
        ),
        tokenProvider: overrides.infrastructure?.tokenProvider || jwt,
        transactionManager,
        generateRandomCode: (
            overrides.infrastructure?.generateRandomCode
            || generateRandomCode
        ),
        getJwtSecret: (
            overrides.infrastructure?.getJwtSecret
            || (() => config.auth.jwtSecret)
        ),
        httpSecurityConfig: (
            overrides.infrastructure?.httpSecurityConfig
            || config.httpSecurity
        ),
        logger: overrides.infrastructure?.logger || console
    };

    const services = {};
    services.balance = overrides.services?.balance || createBalanceService({
        debtRepository: repositories.debt
    });
    services.user = overrides.services?.user || createUserService({
        balanceService: services.balance,
        debtRepository: repositories.debt,
        passwordHasher: infrastructure.passwordHasher,
        transactionManager: infrastructure.transactionManager,
        userRepository: repositories.user
    });
    services.group = overrides.services?.group || createGroupService({
        generateRandomCode: infrastructure.generateRandomCode,
        groupRepository: repositories.group,
        userRepository: repositories.user
    });
    services.auth = overrides.services?.auth || createAuthService({
        getJwtSecret: infrastructure.getJwtSecret,
        passwordHasher: infrastructure.passwordHasher,
        tokenProvider: infrastructure.tokenProvider,
        userRepository: repositories.user
    });
    services.debt = overrides.services?.debt || createDebtService({
        debtRepository: repositories.debt,
        groupRepository: repositories.group,
        transactionManager: infrastructure.transactionManager
    });

    const httpSecurity = createHttpSecurity(
        infrastructure.httpSecurityConfig
    );
    const legacyApiEnabled = (
        infrastructure.apiLifecycleConfig.legacyApiEnabled
    );
    const createLegacyMiddleware = (
        successorBasePath,
        pathRewrites = {}
    ) => createDeprecateEndpoint({
        deprecationDate: (
            infrastructure.apiLifecycleConfig.legacyApiDeprecationDate
        ),
        logger: infrastructure.logger,
        logUsage: infrastructure.apiLifecycleConfig.legacyApiLogUsage,
        resolveSuccessorPath: createLegacySuccessorResolver({
            pathRewrites,
            successorBasePath
        }),
        sunsetDate: infrastructure.apiLifecycleConfig.legacyApiSunsetDate
    });
    const legacyApi = legacyApiEnabled ? (overrides.middleware?.legacyApi || {
        auth: createLegacyMiddleware('/api/v2/auth'),
        debt: createLegacyMiddleware('/api/v2/payment'),
        group: createLegacyMiddleware('/api/v2/group', {
            '/mygroups': ''
        }),
        user: createLegacyMiddleware('/api/v2/user', {
            '/nick': req => {
                const nickname = typeof req.body?.nick === 'string'
                    ? req.body.nick.trim()
                    : '';

                return nickname
                    ? `/by-nickname/${encodeURIComponent(nickname)}`
                    : '/by-nickname';
            }
        })
    }) : null;
    const middleware = {
        authVerify: (
            overrides.middleware?.authVerify
            || createAuthVerify({
                getJwtSecret: infrastructure.getJwtSecret,
                tokenProvider: infrastructure.tokenProvider,
                userRepository: repositories.user
            })
        ),
        cors: overrides.middleware?.cors ?? httpSecurity.cors,
        globalRateLimiter: (
            overrides.middleware?.globalRateLimiter
            ?? httpSecurity.globalRateLimiter
        ),
        helmet: overrides.middleware?.helmet ?? httpSecurity.helmet,
        loginRateLimiter: (
            overrides.middleware?.loginRateLimiter
            ?? httpSecurity.loginRateLimiter
        ),
        registrationRateLimiter: (
            overrides.middleware?.registrationRateLimiter
            ?? httpSecurity.registrationRateLimiter
        ),
        legacyApi
    };

    const controllers = {};
    if (legacyApiEnabled) {
        controllers.user = overrides.controllers?.user || createUserController({
            userService: services.user
        });
        controllers.group = overrides.controllers?.group || createGroupController({
            groupService: services.group
        });
        controllers.auth = overrides.controllers?.auth || createAuthController({
            authService: services.auth
        });
        controllers.debt = overrides.controllers?.debt || createDebtController({
            debtService: services.debt
        });
    }
    controllers.v2 = {
        user: (
            overrides.controllers?.v2?.user
            || createUserControllerV2({ userService: services.user })
        ),
        group: (
            overrides.controllers?.v2?.group
            || createGroupControllerV2({ groupService: services.group })
        ),
        auth: (
            overrides.controllers?.v2?.auth
            || createAuthControllerV2({ authService: services.auth })
        ),
        debt: (
            overrides.controllers?.v2?.debt
            || createDebtControllerV2({ debtService: services.debt })
        )
    };

    const routers = {};
    if (legacyApiEnabled) {
        routers.user = overrides.routers?.user || createUserRouter({
            authVerify: middleware.authVerify,
            registrationRateLimiter: middleware.registrationRateLimiter,
            userController: controllers.user
        });
        routers.group = overrides.routers?.group || createGroupRouter({
            authVerify: middleware.authVerify,
            groupController: controllers.group
        });
        routers.auth = overrides.routers?.auth || createAuthRouter({
            authController: controllers.auth,
            loginRateLimiter: middleware.loginRateLimiter
        });
        routers.debt = overrides.routers?.debt || createDebtRouter({
            authVerify: middleware.authVerify,
            debtController: controllers.debt
        });
    }
    routers.v2 = {
        user: overrides.routers?.v2?.user || createUserRouterV2({
            authVerify: middleware.authVerify,
            registrationRateLimiter: middleware.registrationRateLimiter,
            userController: controllers.v2.user
        }),
        group: overrides.routers?.v2?.group || createGroupRouter({
            authVerify: middleware.authVerify,
            groupController: controllers.v2.group,
            includeDeprecatedAliases: false
        }),
        auth: overrides.routers?.v2?.auth || createAuthRouter({
            authController: controllers.v2.auth,
            loginRateLimiter: middleware.loginRateLimiter
        }),
        debt: overrides.routers?.v2?.debt || createDebtRouter({
            authVerify: middleware.authVerify,
            debtController: controllers.v2.debt
        })
    };

    return {
        controllers,
        infrastructure,
        middleware,
        repositories,
        routers,
        services
    };
};

module.exports = { createCompositionRoot };
