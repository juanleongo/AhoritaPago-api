const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createCompositionRoot } = require('../../src/compositionRoot');
const { createTestAppConfig } = require('../fixtures/appConfig');

const { routers } = createCompositionRoot({
    infrastructure: { config: createTestAppConfig() }
});
const { v2 } = routers;
const {
    debt: debtRouter,
    group: groupRouter,
    user: userRouter
} = v2;

const findMiddlewareIndex = (router, middlewareName) => (
    router.stack.findIndex(layer => layer.name === middlewareName)
);

const routesBefore = (router, stackIndex) => (
    router.stack
        .slice(0, stackIndex)
        .filter(layer => layer.route)
        .map(layer => ({
            path: layer.route.path,
            methods: Object.keys(layer.route.methods)
        }))
);

describe('protección de rutas', () => {
    it('deja público únicamente el registro de usuarios', () => {
        const authIndex = findMiddlewareIndex(userRouter, 'authVerify');

        assert.ok(authIndex >= 0);
        assert.deepEqual(routesBefore(userRouter, authIndex), [
            { path: '/', methods: ['post'] }
        ]);
    });

    it('protege todas las rutas de grupos', () => {
        const authIndex = findMiddlewareIndex(groupRouter, 'authVerify');

        assert.ok(authIndex >= 0);
        assert.deepEqual(routesBefore(groupRouter, authIndex), []);
    });

    it('protege todas las rutas de deudas', () => {
        const authIndex = findMiddlewareIndex(debtRouter, 'authVerify');

        assert.ok(authIndex >= 0);
        assert.deepEqual(routesBefore(debtRouter, authIndex), []);
    });

    it('declara /history antes de la ruta dinámica /:id', () => {
        const historyIndex = debtRouter.stack.findIndex(
            layer => layer.route?.path === '/history'
        );
        const dynamicIdIndex = debtRouter.stack.findIndex(
            layer => layer.route?.path === '/:id'
        );

        assert.ok(historyIndex >= 0);
        assert.ok(dynamicIdIndex >= 0);
        assert.ok(historyIndex < dynamicIdIndex);
    });

    it('no incluye /mygroups en el router de grupos', () => {
        const paths = groupRouter.stack
            .filter(layer => layer.route)
            .map(layer => layer.route.path);

        assert.equal(paths.includes('/mygroups'), false);
    });
});
