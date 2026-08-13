const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
    createGroupRouter
} = require('../../src/routes/factories/createGroupRouter');

const withHttpApp = async (app, work) => {
    const listener = app.listen(0);
    await new Promise(resolve => listener.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${listener.address().port}`;

    try {
        await work(baseUrl);
    } finally {
        await new Promise((resolve, reject) => {
            listener.close(error => error ? reject(error) : resolve());
        });
    }
};

const createController = calls => {
    const noOp = (req, res) => res.status(204).end();

    return {
        addMember: noOp,
        createGroup: noOp,
        deleteGroup: noOp,
        getGroupById: noOp,
        getGroupsForUser(req, res) {
            calls.push(req.user.userId);
            res.status(200).json([{ _id: 'group-1', name: 'Amigos' }]);
        },
        updateGroup: noOp
    };
};

describe('deprecación del listado duplicado de grupos', () => {
    it('usa el mismo handler para la ruta canónica y el alias', () => {
        const router = createGroupRouter({
            authVerify(req, res, next) {
                req.user = { userId: 'user-1' };
                next();
            },
            groupController: createController([])
        });
        const canonicalLayer = router.stack.find(
            layer => layer.route?.path === '/'
        );
        const deprecatedLayer = router.stack.find(
            layer => layer.route?.path === '/mygroups'
        );

        assert.equal(
            deprecatedLayer.route.stack.at(-1).handle,
            canonicalLayer.route.stack.at(-1).handle
        );
    });

    it('mantiene el JSON y anuncia la ruta sucesora por headers', async () => {
        const calls = [];
        const router = createGroupRouter({
            authVerify(req, res, next) {
                req.user = { userId: 'user-1' };
                next();
            },
            groupController: createController(calls)
        });
        const app = express();
        app.use('/api/group', router);

        await withHttpApp(app, async baseUrl => {
            const canonicalResponse = await fetch(`${baseUrl}/api/group`);
            const deprecatedResponse = await fetch(
                `${baseUrl}/api/group/mygroups`
            );

            assert.equal(canonicalResponse.status, 200);
            assert.equal(deprecatedResponse.status, 200);
            assert.deepEqual(
                await deprecatedResponse.json(),
                await canonicalResponse.json()
            );
            assert.equal(
                canonicalResponse.headers.get('deprecation'),
                null
            );
            assert.equal(
                deprecatedResponse.headers.get('deprecation'),
                '@1786492800'
            );
            assert.equal(
                deprecatedResponse.headers.get('link'),
                '</api/group>; rel="successor-version"'
            );
            assert.equal(deprecatedResponse.headers.get('sunset'), null);
        });

        assert.deepEqual(calls, ['user-1', 'user-1']);
    });
});
