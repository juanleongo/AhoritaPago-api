const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    LEGACY_BALANCE_FILTER,
    removeDerivedUserBalances
} = require('../../src/migrations/removeDerivedUserBalances');

describe('migración de saldos derivados', () => {
    it('solo cuenta documentos en el modo de simulación predeterminado', async () => {
        let updates = 0;
        const UserModel = {
            collection: {
                async countDocuments(filter) {
                    assert.deepEqual(filter, LEGACY_BALANCE_FILTER);
                    return 3;
                },
                async updateMany() {
                    updates += 1;
                }
            }
        };

        assert.deepEqual(
            await removeDerivedUserBalances({ UserModel }),
            {
                acknowledged: false,
                dryRun: true,
                matchedCount: 3,
                modifiedCount: 0
            }
        );
        assert.equal(updates, 0);
    });

    it('elimina ambos campos solo cuando se autoriza la ejecución', async () => {
        let receivedOperation;
        const UserModel = {
            collection: {
                async countDocuments() {
                    return 2;
                },
                async updateMany(filter, update) {
                    receivedOperation = { filter, update };
                    return { acknowledged: true, modifiedCount: 2 };
                }
            }
        };

        const result = await removeDerivedUserBalances({
            UserModel,
            execute: true
        });

        assert.deepEqual(receivedOperation, {
            filter: LEGACY_BALANCE_FILTER,
            update: { $unset: { owe: '', owes: '' } }
        });
        assert.deepEqual(result, {
            acknowledged: true,
            dryRun: false,
            matchedCount: 2,
            modifiedCount: 2
        });
    });
});
