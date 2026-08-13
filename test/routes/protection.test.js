const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createCompositionRoot } = require('../../src/compositionRoot');
const { createTestAppConfig } = require('../fixtures/appConfig');

const { routers } = createCompositionRoot({
    infrastructure: { config: createTestAppConfig() }
});
const {
    debt: debtRouter,
    group: groupRouter,
    user: userRouter,
    v2: v2Routers
} = routers;

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

    it('protege v2 y publica únicamente su registro de usuarios', () => {
        const userAuthIndex = findMiddlewareIndex(
            v2Routers.user,
            'authVerify'
        );
        const groupAuthIndex = findMiddlewareIndex(
            v2Routers.group,
            'authVerify'
        );
        const debtAuthIndex = findMiddlewareIndex(
            v2Routers.debt,
            'authVerify'
        );

        assert.deepEqual(routesBefore(v2Routers.user, userAuthIndex), [
            { path: '/', methods: ['post'] }
        ]);
        assert.deepEqual(routesBefore(v2Routers.group, groupAuthIndex), []);
        assert.deepEqual(routesBefore(v2Routers.debt, debtAuthIndex), []);
    });

    it('no incluye el alias de grupos deprecado dentro de v2', () => {
        const paths = v2Routers.group.stack
            .filter(layer => layer.route)
            .map(layer => layer.route.path);

        assert.equal(paths.includes('/mygroups'), false);
    });
});
