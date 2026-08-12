const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const runIsolatedCheck = source => execFileSync(
    process.execPath,
    ['-e', source],
    {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf8'
    }
);

const legacyModules = [
    './src/controllers/auth',
    './src/controllers/debt',
    './src/controllers/group',
    './src/controllers/user',
    './src/routes/auth',
    './src/routes/debt',
    './src/routes/group',
    './src/routes/user',
    './src/middlewares/authVerify',
    './src/middlewares/httpSecurity',
    './src/middlewares/index',
    './src/services/authService',
    './src/services/debtservice',
    './src/services/groupService',
    './src/services/userService'
];

describe('fábricas puras y carga de módulos', () => {
    it('carga el composition root sin cargar fachadas heredadas', () => {
        const source = `
            require('./src/compositionRoot');
            const legacyModules = ${JSON.stringify(legacyModules)};
            const loaded = legacyModules.filter(modulePath => (
                require.cache[require.resolve(modulePath)]
            ));
            process.stdout.write(JSON.stringify(loaded));
        `;

        assert.deepEqual(
            JSON.parse(runIsolatedCheck(source)),
            []
        );
    });

    it('importa fábricas de router sin construir routers', () => {
        const routeFactories = [
            './src/routes/factories/createAuthRouter',
            './src/routes/factories/createDebtRouter',
            './src/routes/factories/createGroupRouter',
            './src/routes/factories/createUserRouter'
        ];
        const source = `
            const express = require('express');
            const originalRouter = express.Router;
            let constructions = 0;
            express.Router = (...args) => {
                constructions += 1;
                return originalRouter(...args);
            };
            ${JSON.stringify(routeFactories)}.forEach(require);
            process.stdout.write(String(constructions));
        `;

        assert.equal(runIsolatedCheck(source), '0');
    });

    it('las fábricas puras no cargan servicios predeterminados', () => {
        const pureFactories = [
            './src/controllers/factories/createAuthController',
            './src/controllers/factories/createDebtController',
            './src/controllers/factories/createGroupController',
            './src/controllers/factories/createUserController',
            './src/middlewares/factories/createAuthVerify',
            './src/middlewares/factories/createHttpSecurity'
        ];
        const serviceFacades = [
            './src/services/authService',
            './src/services/debtservice',
            './src/services/groupService',
            './src/services/userService'
        ];
        const source = `
            ${JSON.stringify(pureFactories)}.forEach(require);
            const serviceFacades = ${JSON.stringify(serviceFacades)};
            const loaded = serviceFacades.filter(modulePath => (
                require.cache[require.resolve(modulePath)]
            ));
            process.stdout.write(JSON.stringify(loaded));
        `;

        assert.deepEqual(
            JSON.parse(runIsolatedCheck(source)),
            []
        );
    });
});
