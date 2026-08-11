const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createMongooseTransactionManager
} = require('../../src/adapters/mongooseTransactionManager');

describe('mongooseTransactionManager', () => {
    it('ejecuta el trabajo y devuelve su resultado', async () => {
        const calls = [];
        const session = {
            async withTransaction(work) {
                calls.push('withTransaction');
                await work();
            },
            async endSession() {
                calls.push('endSession');
            }
        };
        const transactionManager = createMongooseTransactionManager({
            mongoose: {
                async startSession() {
                    calls.push('startSession');
                    return session;
                }
            }
        });

        const result = await transactionManager.runInTransaction(
            async transaction => {
                calls.push('work');
                assert.equal(transaction, session);
                return { id: 'result-1' };
            }
        );

        assert.deepEqual(result, { id: 'result-1' });
        assert.deepEqual(calls, [
            'startSession',
            'withTransaction',
            'work',
            'endSession'
        ]);
    });

    it('propaga el error del trabajo y siempre cierra la sesión', async () => {
        const failure = new Error('Fallo transaccional');
        let ended = false;
        const transactionManager = createMongooseTransactionManager({
            mongoose: {
                async startSession() {
                    return {
                        async withTransaction(work) {
                            await work();
                        },
                        async endSession() {
                            ended = true;
                        }
                    };
                }
            }
        });

        await assert.rejects(
            () => transactionManager.runInTransaction(async () => {
                throw failure;
            }),
            failure
        );

        assert.equal(ended, true);
    });

    it('conserva el error original si también falla el cierre', async () => {
        const transactionFailure = new Error('Fallo original');
        const transactionManager = createMongooseTransactionManager({
            mongoose: {
                async startSession() {
                    return {
                        async withTransaction(work) {
                            await work();
                        },
                        async endSession() {
                            throw new Error('Fallo al cerrar');
                        }
                    };
                }
            }
        });

        await assert.rejects(
            () => transactionManager.runInTransaction(async () => {
                throw transactionFailure;
            }),
            transactionFailure
        );
    });

    it('propaga el error de cierre si el trabajo fue exitoso', async () => {
        const closeFailure = new Error('Fallo al cerrar');
        const transactionManager = createMongooseTransactionManager({
            mongoose: {
                async startSession() {
                    return {
                        async withTransaction(work) {
                            await work();
                        },
                        async endSession() {
                            throw closeFailure;
                        }
                    };
                }
            }
        });

        await assert.rejects(
            () => transactionManager.runInTransaction(async () => 'ok'),
            closeFailure
        );
    });
});
