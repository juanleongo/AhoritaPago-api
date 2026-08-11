const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const userRepository = require('./repositories/user');
const groupRepository = require('./repositories/group');
const debtRepository = require('./repositories/debt');
const { generateRandomCode } = require('./helpers/codeGenerator');
const { createUserService } = require('./services/factories/createUserService');
const { createGroupService } = require('./services/factories/createGroupService');
const { createAuthService } = require('./services/factories/createAuthService');
const { createDebtService } = require('./services/debt/createDebtService');
const { createAuthVerify } = require('./middlewares/authVerify');
const { createUserController } = require('./controllers/user');
const { createGroupController } = require('./controllers/group');
const { createAuthController } = require('./controllers/auth');
const { createDebtController } = require('./controllers/debt');
const { createUserRouter } = require('./routes/user');
const { createGroupRouter } = require('./routes/group');
const { createAuthRouter } = require('./routes/auth');
const { createDebtRouter } = require('./routes/debt');

const createCompositionRoot = (overrides = {}) => {
    const repositories = {
        user: overrides.repositories?.user || userRepository,
        group: overrides.repositories?.group || groupRepository,
        debt: overrides.repositories?.debt || debtRepository
    };

    const infrastructure = {
        passwordHasher: (
            overrides.infrastructure?.passwordHasher || bcrypt
        ),
        tokenProvider: overrides.infrastructure?.tokenProvider || jwt,
        mongoose: overrides.infrastructure?.mongoose || mongoose,
        generateRandomCode: (
            overrides.infrastructure?.generateRandomCode
            || generateRandomCode
        ),
        getJwtSecret: (
            overrides.infrastructure?.getJwtSecret
            || (() => process.env.JWT_SECRET)
        )
    };

    const services = {};
    services.user = overrides.services?.user || createUserService({
        passwordHasher: infrastructure.passwordHasher,
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
        mongoose: infrastructure.mongoose,
        userService: services.user
    });

    const middleware = {
        authVerify: (
            overrides.middleware?.authVerify
            || createAuthVerify({
                getJwtSecret: infrastructure.getJwtSecret,
                tokenProvider: infrastructure.tokenProvider,
                userRepository: repositories.user
            })
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
            userController: controllers.user
        }),
        group: overrides.routers?.group || createGroupRouter({
            authVerify: middleware.authVerify,
            groupController: controllers.group
        }),
        auth: overrides.routers?.auth || createAuthRouter({
            authController: controllers.auth
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
