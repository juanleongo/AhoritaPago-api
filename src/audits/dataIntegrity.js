const {
    USER_IDENTITY_LIMITS,
    hasIdentityLength,
    isValidEmail,
    normalizeEmail,
    normalizeName,
    normalizeNickname
} = require('../config/userIdentity');
const { MAX_COP_AMOUNT } = require('../helpers/copMoney');

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
                            { $ne: [{ $size: '$debtors' }, 1] },
                            ['DEBTOR_CARDINALITY_INVALID'],
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
                    },
                    {
                        $cond: [
                            {
                                $cond: [
                                    { $isNumber: '$value' },
                                    {
                                        $ne: [
                                            { $trunc: '$value' },
                                            '$value'
                                        ]
                                    },
                                    false
                                ]
                            },
                            ['VALUE_NOT_INTEGER_COP'],
                            []
                        ]
                    },
                    {
                        $cond: [
                            {
                                $cond: [
                                    { $isNumber: '$value' },
                                    { $gt: ['$value', MAX_COP_AMOUNT] },
                                    false
                                ]
                            },
                            ['VALUE_OUT_OF_SAFE_RANGE'],
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

const buildActiveBalancesPipeline = () => [
    { $match: { state: true } },
    {
        $project: {
            creditor: 1,
            debtors: {
                $cond: [
                    { $isArray: '$debtor' },
                    '$debtor',
                    []
                ]
            },
            safeValue: {
                $cond: [
                    { $isNumber: '$value' },
                    '$value',
                    0
                ]
            }
        }
    },
    {
        $project: {
            entries: {
                $concatArrays: [
                    {
                        $cond: [
                            {
                                $ne: [
                                    { $ifNull: ['$creditor', null] },
                                    null
                                ]
                            },
                            [{
                                userId: '$creditor',
                                owe: 0,
                                owes: '$safeValue'
                            }],
                            []
                        ]
                    },
                    {
                        $map: {
                            input: '$debtors',
                            as: 'debtorId',
                            in: {
                                userId: '$$debtorId',
                                owe: '$safeValue',
                                owes: 0
                            }
                        }
                    }
                ]
            }
        }
    },
    { $unwind: '$entries' },
    { $match: { 'entries.userId': { $ne: null } } },
    {
        $group: {
            _id: '$entries.userId',
            owe: { $sum: '$entries.owe' },
            owes: { $sum: '$entries.owes' }
        }
    },
    { $project: { _id: 0, userId: '$_id', owe: 1, owes: 1 } }
];

const findLegacyUniqueGroupNameIndexes = indexes => indexes.filter(index => {
    const indexedFields = Object.keys(index.key || {});

    return index.unique === true
        && indexedFields.length === 1
        && indexedFields[0] === 'name';
});

const toIdString = id => id?.toString();

const auditStoredBalances = (users, derivedBalances) => {
    const balancesByUser = new Map(
        derivedBalances.map(balance => [
            toIdString(balance.userId),
            { owe: balance.owe, owes: balance.owes }
        ])
    );
    const existingUserIds = new Set();
    const mismatches = [];
    let legacyFieldCount = 0;

    users.forEach(user => {
        const userId = toIdString(user._id);
        const hasOwe = Object.prototype.hasOwnProperty.call(user, 'owe');
        const hasOwes = Object.prototype.hasOwnProperty.call(user, 'owes');
        const hasLegacyFields = hasOwe || hasOwes;
        const stored = {
            owe: Number.isFinite(user.owe) ? user.owe : 0,
            owes: Number.isFinite(user.owes) ? user.owes : 0
        };
        const derived = balancesByUser.get(userId) || { owe: 0, owes: 0 };

        existingUserIds.add(userId);
        if (hasLegacyFields) {
            legacyFieldCount += 1;
        }
        if (
            hasLegacyFields
            && (stored.owe !== derived.owe || stored.owes !== derived.owes)
        ) {
            mismatches.push({ userId, stored, derived });
        }
    });

    const orphanParticipantIds = derivedBalances
        .map(balance => toIdString(balance.userId))
        .filter(userId => !existingUserIds.has(userId));

    return {
        legacyFieldCount,
        mismatchCount: mismatches.length,
        mismatches,
        orphanParticipantCount: orphanParticipantIds.length,
        orphanParticipantIds
    };
};

const auditUserIdentities = users => {
    const invalidRecords = users.reduce((records, user) => {
        const issues = [];
        const normalizedName = normalizeName(user.name);
        const normalizedNickname = normalizeNickname(user.nickname);
        const normalizedEmail = normalizeEmail(user.email);

        if (!hasIdentityLength(normalizedName, USER_IDENTITY_LIMITS.name)) {
            issues.push('NAME_LENGTH_INVALID');
        }
        if (normalizedName !== user.name) {
            issues.push('NAME_NOT_NORMALIZED');
        }
        if (!hasIdentityLength(
            normalizedNickname,
            USER_IDENTITY_LIMITS.nickname
        )) {
            issues.push('NICKNAME_LENGTH_INVALID');
        }
        if (normalizedNickname !== user.nickname) {
            issues.push('NICKNAME_NOT_TRIMMED');
        }
        if (!hasIdentityLength(normalizedEmail, USER_IDENTITY_LIMITS.email)) {
            issues.push('EMAIL_LENGTH_INVALID');
        }
        if (
            !isValidEmail(normalizedEmail)
        ) {
            issues.push('EMAIL_FORMAT_INVALID');
        }
        if (normalizedEmail !== user.email) {
            issues.push('EMAIL_NOT_TRIMMED');
        }

        if (issues.length > 0) {
            records.push({
                userId: toIdString(user._id),
                issues
            });
        }

        return records;
    }, []);

    return {
        invalidCount: invalidRecords.length,
        invalidRecords
    };
};

const auditDataIntegrity = async ({ DebtModel, GroupModel, UserModel }) => {
    const [
        invalidDebts,
        groupIndexes,
        derivedBalances,
        users
    ] = await Promise.all([
        DebtModel.aggregate(buildDebtIntegrityPipeline()),
        GroupModel.collection.indexes(),
        DebtModel.aggregate(buildActiveBalancesPipeline()),
        UserModel.collection.find(
            {},
            {
                projection: {
                    _id: 1,
                    email: 1,
                    name: 1,
                    nickname: 1,
                    owe: 1,
                    owes: 1
                }
            }
        ).toArray()
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
        balances: auditStoredBalances(users, derivedBalances),
        users: auditUserIdentities(users),
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
    auditStoredBalances,
    auditUserIdentities,
    buildActiveBalancesPipeline,
    buildDebtIntegrityPipeline,
    findLegacyUniqueGroupNameIndexes
};
