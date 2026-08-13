const User = require('../models/user');
const { escapeRegex } = require('../helpers/escapeRegex');
const {
    applyTransaction,
    buildWriteOptions
} = require('./repositoryOptions');
const { getPaginationOffset } = require('../helpers/pagination');
const {
    normalizeEmail,
    normalizeNickname
} = require('../config/userIdentity');

const activeNicknameFilter = searchTerm => ({
    nickname: new RegExp(escapeRegex(normalizeNickname(searchTerm)), 'i'),
    state: true
});

const findById = async (id, options = {}) => (
    applyTransaction(User.findById(id), options)
);

const findActiveById = async (id, options = {}) => (
    applyTransaction(
        User.findOne({ _id: id, state: true }),
        options
    )
);

const findByEmail = async (email, options = {}) => (
    applyTransaction(
        User.findOne({ email: normalizeEmail(email) }),
        options
    )
);

const findByNickname = async (nickname, options = {}) => (
    applyTransaction(
        User.findOne({
            nickname: normalizeNickname(nickname)
        }).select('nickname name'),
        options
    )
);

const findActiveByNickname = async (nickname, options = {}) => (
    applyTransaction(
        User.findOne({
            nickname: normalizeNickname(nickname),
            state: true
        }).select('nickname name'),
        options
    )
);

const countActiveByNickname = async (searchTerm, options = {}) => (
    applyTransaction(
        User.countDocuments(activeNicknameFilter(searchTerm)),
        options
    )
);

const searchActiveByNickname = async (
    searchTerm,
    { page, limit },
    options = {}
) => (
    applyTransaction(
        User.find(activeNicknameFilter(searchTerm))
            .sort({ nickname: 1, _id: 1 })
            .skip(getPaginationOffset(page, limit))
            .limit(limit)
            .select('nickname name'),
        options
    )
);

const create = async (userData, options = {}) => {
    if (!options.transaction) {
        return User.create(userData);
    }

    const [user] = await User.create([userData], {
        session: options.transaction
    });
    return user;
};

const updateById = async (id, updateData, options = {}) => (
    User.findByIdAndUpdate(
        id,
        updateData,
        buildWriteOptions(options, { new: true, runValidators: true })
    )
);

const deactivateById = async (id, options = {}) => (
    User.findOneAndUpdate(
        { _id: id, state: true },
        { state: false },
        buildWriteOptions(options, { new: true })
    )
);

module.exports = {
    countActiveByNickname,
    create,
    deactivateById,
    findActiveById,
    findActiveByNickname,
    findByEmail,
    findById,
    findByNickname,
    searchActiveByNickname,
    updateById
};
