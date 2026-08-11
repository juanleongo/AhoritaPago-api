const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createConnection } = require('../../src/db/config');

describe('conexión inyectada a MongoDB', () => {
    it('utiliza únicamente la URI validada recibida', async () => {
        const calls = [];
        const databaseUrl = 'mongodb://database.example.com/ahoritapago';
        const connect = createConnection({
            databaseUrl,
            logger: {
                log(message) {
                    calls.push(['log', message]);
                }
            },
            mongooseProvider: {
                async connect(url, options) {
                    calls.push(['connect', url, options]);
                }
            }
        });

        await connect();

        assert.deepEqual(calls, [
            ['connect', databaseUrl, {}],
            ['log', 'DB Connected']
        ]);
    });

    it('propaga el error y no informa una conexión exitosa', async () => {
        const connectionError = new Error('MongoDB no disponible');
        let successWasLogged = false;
        const connect = createConnection({
            databaseUrl: 'mongodb://database.example.com/ahoritapago',
            logger: {
                log() {
                    successWasLogged = true;
                }
            },
            mongooseProvider: {
                async connect() {
                    throw connectionError;
                }
            }
        });

        await assert.rejects(connect(), connectionError);
        assert.equal(successWasLogged, false);
    });
});
