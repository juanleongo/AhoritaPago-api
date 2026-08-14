const {
    MAX_COP_AMOUNT,
    toCopNumber
} = require('../helpers/copMoney');

const LONG_VALUE_FILTER = { value: { $type: 'long' } };
const NON_LONG_VALUE_FILTER = { value: { $not: { $type: 'long' } } };
const MIGRATABLE_VALUE_FILTER = {
    ...NON_LONG_VALUE_FILTER,
    $expr: {
        $cond: [
            { $isNumber: '$value' },
            {
                $and: [
                    { $gt: ['$value', 0] },
                    { $lte: ['$value', MAX_COP_AMOUNT] },
                    { $eq: [{ $trunc: '$value' }, '$value'] }
                ]
            },
            false
        ]
    }
};

const getStoredType = value => (
    value?._bsontype || typeof value
);

const getReportValue = value => {
    if (typeof value === 'bigint') {
        return value.toString();
    }

    if (value && typeof value.toBigInt === 'function') {
        return value.toBigInt().toString();
    }

    return value;
};

const auditDebtValuesForCopMigration = async ({ DebtModel }) => {
    const cursor = DebtModel.collection.find(
        {},
        { projection: { _id: 1, value: 1 } }
    );
    const invalidRecords = [];
    let totalCount = 0;

    for await (const debt of cursor) {
        totalCount += 1;
        try {
            toCopNumber(debt.value);
        } catch {
            invalidRecords.push({
                debtId: debt._id.toString(),
                issue: 'VALUE_NOT_INTEGER_COP',
                storedType: getStoredType(debt.value),
                value: getReportValue(debt.value)
            });
        }
    }
    const longCount = await DebtModel.collection.countDocuments(
        LONG_VALUE_FILTER
    );

    return {
        totalCount,
        longCount,
        pendingCount: totalCount - longCount,
        invalidCount: invalidRecords.length,
        invalidRecords
    };
};

const convertDebtValuesToCopIntegers = async ({
    DebtModel,
    execute = false
}) => {
    const audit = await auditDebtValuesForCopMigration({ DebtModel });

    if (!execute) {
        return {
            acknowledged: false,
            dryRun: true,
            matchedCount: audit.pendingCount,
            modifiedCount: 0,
            ...audit
        };
    }

    if (audit.invalidCount > 0) {
        const error = new Error(
            'Existen deudas con valores que no son enteros COP válidos.'
        );
        error.code = 'COP_MIGRATION_INVALID_VALUES';
        error.audit = audit;
        throw error;
    }

    const result = await DebtModel.collection.updateMany(
        MIGRATABLE_VALUE_FILTER,
        [{
            $set: {
                value: {
                    $convert: {
                        input: '$value',
                        to: 'long'
                    }
                }
            }
        }]
    );
    const remainingCount = await DebtModel.collection.countDocuments(
        NON_LONG_VALUE_FILTER
    );

    if (remainingCount > 0) {
        const error = new Error(
            'La migración no convirtió todos los valores pendientes.'
        );
        error.code = 'COP_MIGRATION_INCOMPLETE';
        error.migration = {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            remainingCount
        };
        throw error;
    }

    return {
        acknowledged: result.acknowledged,
        dryRun: false,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        invalidCount: 0,
        remainingCount,
        totalCount: audit.totalCount
    };
};

module.exports = {
    LONG_VALUE_FILTER,
    MIGRATABLE_VALUE_FILTER,
    NON_LONG_VALUE_FILTER,
    auditDebtValuesForCopMigration,
    convertDebtValuesToCopIntegers
};
