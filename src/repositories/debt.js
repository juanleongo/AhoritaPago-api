const Debt = require('../models/debt');
const {
    applySession,
    buildWriteOptions
} = require('./repositoryOptions');

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
    applySession(Debt.findById(id), options)
);

const findActiveByDebtor = async (userId, options = {}) => (
    applySession(
        Debt.find({ debtor: userId, state: true })
            .populate('debtor', 'name')
            .populate('creditor', 'name'),
        options
    )
);

const findActiveByParticipant = async (userId, options = {}) => (
    applySession(
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

const findHistoryByParticipant = async (userId, options = {}) => (
    applySession(
        Debt.find({
            $or: [
                { creditor: userId },
                { debtor: userId }
            ]
        })
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
    applySession(
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
    create,
    deleteById,
    findActiveByDebtor,
    findActiveByParticipant,
    findActiveByParticipantAndGroup,
    findById,
    findHistoryByParticipant,
    updateById
};
