const Group = require('../models/group');
const {
    applyTransaction,
    buildWriteOptions
} = require('./repositoryOptions');

const findAllActive = async (options = {}) => (
    applyTransaction(Group.find({ state: true }), options)
);

const findAllActiveByUser = async (userId, options = {}) => (
    applyTransaction(
        Group.find({ members: userId, state: true }),
        options
    )
);

const findById = async (id, options = {}) => (
    applyTransaction(Group.findById(id), options)
);

const findActiveById = async (id, options = {}) => (
    applyTransaction(Group.findOne({ _id: id, state: true }), options)
);

const findByCode = async (code, options = {}) => (
    applyTransaction(Group.findOne({ code }), options)
);

const findActiveByCode = async (code, options = {}) => (
    applyTransaction(Group.findOne({ code, state: true }), options)
);

const create = async (groupData, options = {}) => {
    if (!options.transaction) {
        return Group.create(groupData);
    }

    const [group] = await Group.create([groupData], {
        session: options.transaction
    });
    return group;
};

const updateById = async (id, groupData, options = {}) => (
    Group.findByIdAndUpdate(
        id,
        groupData,
        buildWriteOptions(options, { new: true, runValidators: true })
    )
);

const deactivateById = async (id, options = {}) => (
    Group.findByIdAndUpdate(
        id,
        { state: false },
        buildWriteOptions(options, { new: true })
    )
);

const addMemberById = async (groupId, userId, options = {}) => (
    Group.findByIdAndUpdate(
        groupId,
        { $addToSet: { members: userId } },
        buildWriteOptions(options, { new: true, runValidators: true })
    )
);

module.exports = {
    addMemberById,
    create,
    deactivateById,
    findActiveByCode,
    findActiveById,
    findAllActive,
    findAllActiveByUser,
    findByCode,
    findById,
    updateById
};
