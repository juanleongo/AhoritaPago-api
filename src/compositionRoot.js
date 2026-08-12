const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('./repositories/user');
const groupRepository = require('./repositories/group');
const debtRepository = require('./repositories/debt');
const { generateRandomCode } = require('./helpers/codeGenerator');
const { createUserService } = require('./services/factories/createUserService');
const { createGroupService } = require('./services/factories/createGroupService');
const { createAuthService } = require('./services/factories/createAuthService');
const { createDebtService } = require('./services/debt/createDebtService');
const {
    createAuthVerify
} = require('./middlewares/factories/createAuthVerify');
const {
    createHttpSecurity
} = require('./middlewares/factories/createHttpSecurity');
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
    services.user = overrides.services?.user || createUserService({
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
        transactionManager: infrastructure.transactionManager,
        userService: services.user
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
        user: overrides.controllers?.user || createUserController({
            userService: services.user
        }),
        group: overrides.controllers?.group || createGroupController({
            groupService: services.group
        }),
        auth: overrides.controllers?.auth || createAuthController({
            authService: services.auth
        }),
        debt: overrides.controllers?.debt || createDebtController({
            debtService: services.debt
        })
    };

    const routers = {
        user: overrides.routers?.user || createUserRouter({
            authVerify: middleware.authVerify,
            registrationRateLimiter: middleware.registrationRateLimiter,
            userController: controllers.user
        }),
        group: overrides.routers?.group || createGroupRouter({
            authVerify: middleware.authVerify,
            groupController: controllers.group
        }),
        auth: overrides.routers?.auth || createAuthRouter({
            authController: controllers.auth,
            loginRateLimiter: middleware.loginRateLimiter
        }),
        debt: overrides.routers?.debt || createDebtRouter({
            authVerify: middleware.authVerify,
            debtController: controllers.debt
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
