const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');

const runIsolatedCheck = source => execFileSync(
    process.execPath,
    ['-e', source],
    {
        cwd: projectRoot,
        encoding: 'utf8'
    }
);

const removedFacades = [
    'src/controllers/auth.js',
    'src/controllers/debt.js',
    'src/controllers/group.js',
    'src/controllers/user.js',
    'src/routes/auth.js',
    'src/routes/debt.js',
    'src/routes/group.js',
    'src/routes/user.js',
    'src/middlewares/authVerify.js',
    'src/middlewares/httpSecurity.js',
    'src/middlewares/index.js',
    'src/services/authService.js',
    'src/services/debtservice.js',
    'src/services/groupService.js',
    'src/services/userService.js',
    'src/services/debt/deleteDebt.js',
    'src/config/apiLifecycle.js',
    'src/controllers/factories/createAuthController.js',
    'src/controllers/factories/createDebtController.js',
    'src/controllers/factories/createGroupController.js',
    'src/controllers/factories/createUserController.js',
    'src/helpers/paginationHeaders.js',
    'src/middlewares/deprecateEndpoint.js',
    'src/routes/factories/createUserRouter.js'
];

describe('fábricas puras y carga de módulos', () => {
    it('retira físicamente todas las fachadas heredadas', () => {
        const existingFacades = removedFacades.filter(relativePath => (
            existsSync(path.join(projectRoot, relativePath))
        ));

        assert.deepEqual(existingFacades, []);
    });

    it('importa fábricas de router sin construir routers', () => {
        const routeFactories = [
            './src/routes/factories/createAuthRouter',
            './src/routes/factories/createDebtRouter',
            './src/routes/factories/createGroupRouter',
            './src/routes/v2/createUserRouter'
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

    it('carga el composition root sin construir la aplicación', () => {
        const source = `
            const express = require('express');
            const originalRouter = express.Router;
            let constructions = 0;
            express.Router = (...args) => {
                constructions += 1;
                return originalRouter(...args);
            };
            require('./src/compositionRoot');
            process.stdout.write(String(constructions));
        `;

        assert.equal(runIsolatedCheck(source), '0');
    });
});
