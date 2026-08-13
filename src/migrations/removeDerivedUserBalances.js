const LEGACY_BALANCE_FILTER = {
    $or: [
        { owe: { $exists: true } },
        { owes: { $exists: true } }
    ]
};

const removeDerivedUserBalances = async ({
    UserModel,
    execute = false
}) => {
    const matchedCount = await UserModel.collection.countDocuments(
        LEGACY_BALANCE_FILTER
    );

    if (!execute) {
        return {
            acknowledged: false,
            dryRun: true,
            matchedCount,
            modifiedCount: 0
        };
    }

    const result = await UserModel.collection.updateMany(
        LEGACY_BALANCE_FILTER,
        { $unset: { owe: '', owes: '' } }
    );

    return {
        acknowledged: result.acknowledged,
        dryRun: false,
        matchedCount,
        modifiedCount: result.modifiedCount
    };
};

module.exports = {
    LEGACY_BALANCE_FILTER,
    removeDerivedUserBalances
};
