const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createCompositionRoot } = require('../../src/compositionRoot');
const { createTestAppConfig } = require('../fixtures/appConfig');

const { routers } = createCompositionRoot({
    infrastructure: { config: createTestAppConfig() }
});
const {
    auth: authRouter,
    debt: debtRouter,
    group: groupRouter,
    user: userRouter
} = routers;

const middlewareNamesFor = (router, method, path) => {
    const layer = router.stack.find(item => (
        item.route?.path === path
        && item.route.methods[method]
    ));

    assert.ok(layer, `No se encontró ${method.toUpperCase()} ${path}`);
    return layer.route.stack.map(item => item.name);
};

describe('cobertura de validación en rutas', () => {
    it('protege los contratos de body y query con lista de campos', () => {
        const routes = [
            [authRouter, 'post', '/login'],
            [userRouter, 'post', '/'],
            [userRouter, 'get', '/nick'],
            [userRouter, 'put', '/:id'],
            [userRouter, 'delete', '/:id'],
            [userRouter, 'get', '/search/:searchTerm'],
            [groupRouter, 'post', '/'],
            [groupRouter, 'post', '/addMember'],
            [groupRouter, 'put', '/:id'],
            [groupRouter, 'delete', '/:id'],
            [debtRouter, 'post', '/'],
            [debtRouter, 'put', '/:id'],
            [debtRouter, 'put', '/pay/:id'],
            [debtRouter, 'delete', '/:id'],
            [debtRouter, 'get', '/history']
        ];

        routes.forEach(([router, method, path]) => {
            const names = middlewareNamesFor(router, method, path);
            assert.ok(names.includes('allowedFieldsMiddleware'));
            assert.ok(names.includes('validateForms'));
        });
    });

    it('valida todas las rutas que reciben parámetros', () => {
        const routes = [
            [userRouter, 'get', '/search/:searchTerm'],
            [userRouter, 'get', '/:id'],
            [userRouter, 'put', '/:id'],
            [userRouter, 'delete', '/:id'],
            [groupRouter, 'get', '/:id'],
            [groupRouter, 'put', '/:id'],
            [groupRouter, 'delete', '/:id'],
            [debtRouter, 'get', '/group/:groupCode'],
            [debtRouter, 'get', '/:id'],
            [debtRouter, 'put', '/:id'],
            [debtRouter, 'put', '/pay/:id'],
            [debtRouter, 'delete', '/:id']
        ];

        routes.forEach(([router, method, path]) => {
            const names = middlewareNamesFor(router, method, path);
            assert.ok(names.includes('validateForms'));
        });
    });
});
