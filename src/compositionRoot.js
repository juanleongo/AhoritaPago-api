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
        )
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
        debtRepository: repositories.debt,
        generateRandomCode: infrastructure.generateRandomCode,
        groupRepository: repositories.group,
        transactionManager: infrastructure.transactionManager,
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
        )
    };

    const controllers = {
        v2: {
            auth: (
                overrides.controllers?.v2?.auth
                || createAuthControllerV2({ authService: services.auth })
            ),
            debt: (
                overrides.controllers?.v2?.debt
                || createDebtControllerV2({ debtService: services.debt })
            ),
            group: (
                overrides.controllers?.v2?.group
                || createGroupControllerV2({ groupService: services.group })
            ),
            user: (
                overrides.controllers?.v2?.user
                || createUserControllerV2({ userService: services.user })
            )
        }
    };

    const routers = {
        v2: {
            auth: overrides.routers?.v2?.auth || createAuthRouter({
                authController: controllers.v2.auth,
                loginRateLimiter: middleware.loginRateLimiter
            }),
            debt: overrides.routers?.v2?.debt || createDebtRouter({
                authVerify: middleware.authVerify,
                debtController: controllers.v2.debt
            }),
            group: overrides.routers?.v2?.group || createGroupRouter({
                authVerify: middleware.authVerify,
                groupController: controllers.v2.group
            }),
            user: overrides.routers?.v2?.user || createUserRouterV2({
                authVerify: middleware.authVerify,
                registrationRateLimiter: middleware.registrationRateLimiter,
                userController: controllers.v2.user
            })
        }
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
