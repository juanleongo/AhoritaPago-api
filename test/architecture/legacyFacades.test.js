const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('fachadas heredadas', () => {
    it('conserva la API pública de controladores', () => {
        const controllers = {
            auth: require('../../src/controllers/auth'),
            debt: require('../../src/controllers/debt'),
            group: require('../../src/controllers/group'),
            user: require('../../src/controllers/user')
        };

        assert.equal(typeof controllers.auth.createAuthController, 'function');
        assert.equal(typeof controllers.auth.login, 'function');
        assert.equal(typeof controllers.debt.createDebtController, 'function');
        assert.equal(typeof controllers.debt.getDebtHistory, 'function');
        assert.equal(typeof controllers.group.createGroupController, 'function');
        assert.equal(typeof controllers.group.getAllGroups, 'function');
        assert.equal(typeof controllers.user.createUserController, 'function');
        assert.equal(typeof controllers.user.getUserByToken, 'function');
    });

    it('conserva la API pública de routers', () => {
        const routers = {
            auth: require('../../src/routes/auth'),
            debt: require('../../src/routes/debt'),
            group: require('../../src/routes/group'),
            user: require('../../src/routes/user')
        };

        Object.values(routers).forEach(router => {
            assert.ok(Array.isArray(router.stack));
        });
        assert.equal(typeof routers.auth.createAuthRouter, 'function');
        assert.equal(typeof routers.debt.createDebtRouter, 'function');
        assert.equal(typeof routers.group.createGroupRouter, 'function');
        assert.equal(typeof routers.user.createUserRouter, 'function');
    });

    it('conserva las fachadas de middleware', () => {
        const auth = require('../../src/middlewares/authVerify');
        const security = require('../../src/middlewares/httpSecurity');

        assert.equal(typeof auth.authVerify, 'function');
        assert.equal(typeof auth.createAuthVerify, 'function');
        assert.equal(typeof security.createHttpSecurity, 'function');
        assert.equal(typeof security.isOriginAllowed, 'function');
        assert.equal(typeof security.defaultHttpSecurity.helmet, 'function');
    });
});
