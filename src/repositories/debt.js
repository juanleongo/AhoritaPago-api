const Debt = require('../models/debt');
const { Types } = require('mongoose');
const {
    applyTransaction,
    buildWriteOptions
} = require('./repositoryOptions');
const { getPaginationOffset } = require('../helpers/pagination');

const historyFilter = (userId, state) => ({
    state,
    $or: [
        { creditor: userId },
        { debtor: userId }
    ]
});

const activeDebtorFilter = userId => ({
    debtor: userId,
    state: true
});

const activeCreditorFilter = userId => ({
    creditor: userId,
    state: true
});

const activeParticipantAndGroupFilter = (userId, groupId) => ({
    group: groupId,
    state: true,
    $or: [
        { creditor: userId },
        { debtor: userId }
    ]
});

const activeDebtSort = { debtDate: -1, _id: -1 };

const historySort = state => (
    state
        ? { debtDate: -1, _id: -1 }
        : { paymentDate: -1, debtDate: -1, _id: -1 }
);

const toAggregationId = userId => (
    Types.ObjectId.isValid(userId)
        ? new Types.ObjectId(userId)
        : userId
);

const create = async (debtData, options = {}) => {
    const debt = new Debt(debtData);
    return debt.save(buildWriteOptions(options));
};

const deleteById = async (id, options = {}) => (
    Debt.findByIdAndDelete(id, buildWriteOptions(options))
);

const updateById = async (id, debtData, options = {}) => (
    Debt.findByIdAndUpdate(
        id,
        debtData,
        buildWriteOptions(options, { new: true, runValidators: true })
    )
);

const findById = async (id, options = {}) => (
    applyTransaction(Debt.findById(id), options)
);

const existsActiveByGroup = async (groupId, options = {}) => {
    const existingDebt = await applyTransaction(
        Debt.exists({
            group: groupId,
            state: true
        }),
        options
    );

    return Boolean(existingDebt);
};

const existsActiveByParticipant = async (userId, options = {}) => {
    const existingDebt = await applyTransaction(
        Debt.exists({
            state: true,
            $or: [
                { creditor: userId },
                { debtor: userId }
            ]
        }),
        options
    );

    return Boolean(existingDebt);
};

const getActiveBalanceByUserId = async (userId, options = {}) => {
    const participantId = toAggregationId(userId);
    const [balance] = await applyTransaction(
        Debt.aggregate([
            {
                $match: {
                    state: true,
                    $or: [
                        { creditor: participantId },
                        { debtor: participantId }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    owe: {
                        $sum: {
                            $cond: [
                                {
                                    $in: [
                                        participantId,
                                        {
                                            $cond: [
                                                { $isArray: '$debtor' },
                                                '$debtor',
                                                []
                                            ]
                                        }
                                    ]
                                },
                                '$value',
                                0
                            ]
                        }
                    },
                    owes: {
                        $sum: {
                            $cond: [
                                { $eq: ['$creditor', participantId] },
                                '$value',
                                0
                            ]
                        }
                    }
                }
            },
            { $project: { _id: 0, owe: 1, owes: 1 } }
        ]),
        options
    );

    return {
        owe: balance?.owe ?? 0,
        owes: balance?.owes ?? 0
    };
};

const countActiveByCreditor = async (userId, options = {}) => (
    applyTransaction(
        Debt.countDocuments(activeCreditorFilter(userId)),
        options
    )
);

const countActiveByDebtor = async (userId, options = {}) => (
    applyTransaction(
        Debt.countDocuments(activeDebtorFilter(userId)),
        options
    )
);

const countActiveByParticipantAndGroup = async (
    userId,
    groupId,
    options = {}
) => (
    applyTransaction(
        Debt.countDocuments(
            activeParticipantAndGroupFilter(userId, groupId)
        ),
        options
    )
);

const findActiveByCreditor = async (
    userId,
    { page, limit },
    options = {}
) => (
    applyTransaction(
        Debt.find(activeCreditorFilter(userId))
            .sort(activeDebtSort)
            .skip(getPaginationOffset(page, limit))
            .limit(limit)
            .populate('group', 'name code')
            .populate('debtor', 'name nickname')
            .populate('creditor', 'name nickname'),
        options
    )
);

const findActiveByDebtor = async (
    userId,
    { page, limit },
    options = {}
) => (
    applyTransaction(
        Debt.find(activeDebtorFilter(userId))
            .sort(activeDebtSort)
            .skip(getPaginationOffset(page, limit))
            .limit(limit)
            .populate('group', 'name code')
            .populate('debtor', 'name nickname')
            .populate('creditor', 'name nickname'),
        options
    )
);

const countHistoryByParticipant = async (
    userId,
    { state },
    options = {}
) => (
    applyTransaction(
        Debt.countDocuments(historyFilter(userId, state)),
        options
    )
);

const findHistoryByParticipant = async (
    userId,
    { state, page, limit },
    options = {}
) => (
    applyTransaction(
        Debt.find(historyFilter(userId, state))
            .sort(historySort(state))
            .skip(getPaginationOffset(page, limit))
            .limit(limit)
            .populate('group', 'name code')
            .populate('creditor', 'name nickname')
            .populate('debtor', 'name nickname'),
        options
    )
);

const findActiveByParticipantAndGroup = async (
    userId,
    groupId,
    { page, limit },
    options = {}
) => (
    applyTransaction(
        Debt.find(activeParticipantAndGroupFilter(userId, groupId))
            .sort(activeDebtSort)
            .skip(getPaginationOffset(page, limit))
            .limit(limit)
            .populate('group', 'name code')
            .populate('creditor', 'name nickname')
            .populate('debtor', 'name nickname'),
        options
    )
);

module.exports = {
    countActiveByCreditor,
    countActiveByDebtor,
    countActiveByParticipantAndGroup,
    countHistoryByParticipant,
    create,
    deleteById,
    existsActiveByGroup,
    existsActiveByParticipant,
    findActiveByCreditor,
    findActiveByDebtor,
    findActiveByParticipantAndGroup,
    findById,
    findHistoryByParticipant,
    getActiveBalanceByUserId,
    updateById
};
