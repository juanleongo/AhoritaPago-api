const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../index');
const { VALID_ENV } = require('./fixtures/appConfig');

describe('bootstrap de la aplicación', () => {
    it('no carga ni construye Server si la configuración es inválida', async () => {
        const errors = [];
        let loadServerWasCalled = false;
        let exitCode;

        const server = await startServer({
            env: {},
            loadServer() {
                loadServerWasCalled = true;
            },
            logger: {
                error(...messages) {
                    errors.push(messages);
                }
            },
            setExitCode(value) {
                exitCode = value;
            }
        });

        assert.equal(server, null);
        assert.equal(loadServerWasCalled, false);
        assert.equal(exitCode, 1);
        assert.equal(errors.length, 1);
        assert.match(errors[0][1], /PORT/);
        assert.match(errors[0][1], /DATABASE_URL/);
        assert.match(errors[0][1], /JWT_SECRET/);
    });

    it('construye e inicia Server después de validar', async () => {
        const events = [];

        class FakeServer {
            constructor(options) {
                this.config = options.config;
                events.push('constructed');
            }

            async start() {
                events.push('started');
            }
        }

        const server = await startServer({
            env: VALID_ENV,
            loadServer() {
                events.push('loaded');
                return FakeServer;
            },
            logger: { error() {} },
            setExitCode() {}
        });

        assert.ok(server instanceof FakeServer);
        assert.equal(server.config.server.port, 3001);
        assert.deepEqual(events, ['loaded', 'constructed', 'started']);
    });
});
