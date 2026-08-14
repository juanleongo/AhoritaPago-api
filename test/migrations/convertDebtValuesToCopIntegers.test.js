const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    LONG_VALUE_FILTER,
    MIGRATABLE_VALUE_FILTER,
    NON_LONG_VALUE_FILTER,
    convertDebtValuesToCopIntegers
} = require('../../src/migrations/convertDebtValuesToCopIntegers');

const createModel = ({
    debts,
    longCount = 0,
    remainingCount = 0,
    updateResult
} = {}) => {
    const calls = { updates: [] };
    let countCalls = 0;
    const model = {
        collection: {
            find() {
                return {
                    async *[Symbol.asyncIterator]() {
                        yield* debts || [];
                    }
                };
            },
            async countDocuments(filter) {
                countCalls += 1;
                if (countCalls === 1) {
                    assert.deepEqual(filter, LONG_VALUE_FILTER);
                    return longCount;
                }

                assert.deepEqual(filter, NON_LONG_VALUE_FILTER);
                return remainingCount;
            },
            async updateMany(filter, update) {
                calls.updates.push({ filter, update });
                return updateResult || {
                    acknowledged: true,
                    matchedCount: 0,
                    modifiedCount: 0
                };
            }
        }
    };

    return { calls, model };
};

describe('migración de importes COP enteros', () => {
    it('informa pendientes e inválidos sin escribir en dry-run', async () => {
        const { calls, model } = createModel({
            debts: [
                { _id: 'debt-1', value: 1500 },
                { _id: 'debt-2', value: 1.5 }
            ]
        });

        const result = await convertDebtValuesToCopIntegers({
            DebtModel: model
        });

        assert.equal(result.dryRun, true);
        assert.equal(result.totalCount, 2);
        assert.equal(result.pendingCount, 2);
        assert.equal(result.invalidCount, 1);
        assert.equal(
            result.invalidRecords[0].issue,
            'VALUE_NOT_INTEGER_COP'
        );
        assert.deepEqual(calls.updates, []);
    });

    it('impide ejecutar si existe un valor decimal', async () => {
        const { calls, model } = createModel({
            debts: [{ _id: 'debt-1', value: 1500.5 }]
        });

        await assert.rejects(
            () => convertDebtValuesToCopIntegers({
                DebtModel: model,
                execute: true
            }),
            error => error.code === 'COP_MIGRATION_INVALID_VALUES'
        );
        assert.deepEqual(calls.updates, []);
    });

    it('convierte a Int64 y verifica que no queden documentos pendientes', async () => {
        const { calls, model } = createModel({
            debts: [
                { _id: 'debt-1', value: 1500 },
                { _id: 'debt-2', value: { toBigInt: () => 2500n } }
            ],
            longCount: 1,
            updateResult: {
                acknowledged: true,
                matchedCount: 1,
                modifiedCount: 1
            }
        });

        const result = await convertDebtValuesToCopIntegers({
            DebtModel: model,
            execute: true
        });

        assert.deepEqual(calls.updates, [{
            filter: MIGRATABLE_VALUE_FILTER,
            update: [{
                $set: {
                    value: {
                        $convert: {
                            input: '$value',
                            to: 'long'
                        }
                    }
                }
            }]
        }]);
        assert.deepEqual(result, {
            acknowledged: true,
            dryRun: false,
            matchedCount: 1,
            modifiedCount: 1,
            invalidCount: 0,
            remainingCount: 0,
            totalCount: 2
        });
    });

    it('no trunca un decimal que aparezca durante la migración', async () => {
        const { calls, model } = createModel({
            debts: [{ _id: 'debt-1', value: 1500 }],
            remainingCount: 1,
            updateResult: {
                acknowledged: true,
                matchedCount: 1,
                modifiedCount: 1
            }
        });

        await assert.rejects(
            () => convertDebtValuesToCopIntegers({
                DebtModel: model,
                execute: true
            }),
            error => (
                error.code === 'COP_MIGRATION_INCOMPLETE'
                && error.migration.remainingCount === 1
            )
        );
        assert.deepEqual(calls.updates[0].filter, MIGRATABLE_VALUE_FILTER);
    });
});
