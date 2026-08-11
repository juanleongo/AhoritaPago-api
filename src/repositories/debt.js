const Debt = require('../models/debt');
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

const historySort = state => (
    state
        ? { debtDate: -1, _id: -1 }
        : { paymentDate: -1, debtDate: -1, _id: -1 }
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

const findActiveByDebtor = async (userId, options = {}) => (
    applyTransaction(
        Debt.find({ debtor: userId, state: true })
            .populate('debtor', 'name')
            .populate('creditor', 'name'),
        options
    )
);

const findActiveByParticipant = async (userId, options = {}) => (
    applyTransaction(
        Debt.find({
            $or: [
                { creditor: userId },
                { debtor: userId }
            ],
            state: true
        })
            .populate('group', 'name')
            .populate('creditor', 'name nickname')
            .populate('debtor', 'name nickname'),
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
    options = {}
) => (
    applyTransaction(
        Debt.find({
            group: groupId,
            state: true,
            $or: [
                { creditor: userId },
                { debtor: userId }
            ]
        })
            .populate('creditor', 'name nickname')
            .populate('debtor', 'name nickname'),
        options
    )
);

module.exports = {
    countHistoryByParticipant,
    create,
    deleteById,
    existsActiveByParticipant,
    findActiveByDebtor,
    findActiveByParticipant,
    findActiveByParticipantAndGroup,
    findById,
    findHistoryByParticipant,
    updateById
};
