const buildDebtIntegrityPipeline = () => [
    {
        $project: {
            creditor: 1,
            debtor: 1,
            debtors: {
                $cond: [
                    { $isArray: '$debtor' },
                    '$debtor',
                    []
                ]
            },
            debtorWasArray: { $isArray: '$debtor' },
            description: 1,
            group: 1,
            state: 1,
            value: 1
        }
    },
    {
        $set: {
            issues: {
                $concatArrays: [
                    {
                        $cond: [
                            {
                                $eq: [
                                    { $ifNull: ['$creditor', null] },
                                    null
                                ]
                            },
                            ['CREDITOR_REQUIRED'],
                            []
                        ]
                    },
                    {
                        $cond: [
                            {
                                $or: [
                                    { $eq: ['$debtorWasArray', false] },
                                    { $eq: [{ $size: '$debtors' }, 0] }
                                ]
                            },
                            ['DEBTOR_LIST_REQUIRED'],
                            []
                        ]
                    },
                    {
                        $cond: [
                            { $in: [null, '$debtors'] },
                            ['DEBTOR_ITEM_INVALID'],
                            []
                        ]
                    },
                    {
                        $cond: [
                            {
                                $ne: [
                                    { $size: '$debtors' },
                                    {
                                        $size: {
                                            $setUnion: ['$debtors', []]
                                        }
                                    }
                                ]
                            },
                            ['DEBTOR_DUPLICATED'],
                            []
                        ]
                    },
                    {
                        $cond: [
                            {
                                $and: [
                                    {
                                        $ne: [
                                            {
                                                $ifNull: [
                                                    '$creditor',
                                                    null
                                                ]
                                            },
                                            null
                                        ]
                                    },
                                    { $in: ['$creditor', '$debtors'] }
                                ]
                            },
                            ['CREDITOR_IS_DEBTOR'],
                            []
                        ]
                    },
                    {
                        $cond: [
                            {
                                $or: [
                                    {
                                        $not: [
                                            { $isNumber: '$value' }
                                        ]
                                    },
                                    { $lte: ['$value', 0] }
                                ]
                            },
                            ['VALUE_NOT_POSITIVE'],
                            []
                        ]
                    }
                ]
            }
        }
    },
    { $match: { 'issues.0': { $exists: true } } },
    {
        $project: {
            debtorWasArray: 0,
            debtors: 0
        }
    }
];

const findLegacyUniqueGroupNameIndexes = indexes => indexes.filter(index => {
    const indexedFields = Object.keys(index.key || {});

    return index.unique === true
        && indexedFields.length === 1
        && indexedFields[0] === 'name';
});

const auditDataIntegrity = async ({ DebtModel, GroupModel }) => {
    const [invalidDebts, groupIndexes] = await Promise.all([
        DebtModel.aggregate(buildDebtIntegrityPipeline()),
        GroupModel.collection.indexes()
    ]);
    const legacyUniqueGroupNameIndexes = (
        findLegacyUniqueGroupNameIndexes(groupIndexes)
    );

    return {
        readOnly: true,
        generatedAt: new Date().toISOString(),
        debts: {
            invalidCount: invalidDebts.length,
            invalidRecords: invalidDebts
        },
        groups: {
            legacyUniqueNameIndexCount: (
                legacyUniqueGroupNameIndexes.length
            ),
            legacyUniqueNameIndexes: legacyUniqueGroupNameIndexes
        }
    };
};

module.exports = {
    auditDataIntegrity,
    buildDebtIntegrityPipeline,
    findLegacyUniqueGroupNameIndexes
};
