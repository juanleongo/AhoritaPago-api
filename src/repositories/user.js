const User = require('../models/user');
const { escapeRegex } = require('../helpers/escapeRegex');
const {
    applySession,
    buildWriteOptions
} = require('./repositoryOptions');
const { getPaginationOffset } = require('../helpers/pagination');

const activeNicknameFilter = searchTerm => ({
    nickname: new RegExp(escapeRegex(searchTerm), 'i'),
    state: true
});

const findAllActive = async (options = {}) => (
    applySession(User.find({ state: true }), options)
);

const findById = async (id, options = {}) => (
    applySession(User.findById(id), options)
);

const findActiveById = async (id, options = {}) => (
    applySession(
        User.findOne({ _id: id, state: true }),
        options
    )
);

const findByEmail = async (email, options = {}) => (
    applySession(User.findOne({ email }), options)
);

const findByNickname = async (nickname, options = {}) => (
    applySession(
        User.findOne({ nickname }).select('nickname name'),
        options
    )
);

const findActiveByNickname = async (nickname, options = {}) => (
    applySession(
        User.findOne({ nickname, state: true }).select('nickname name'),
        options
    )
);

const countActiveByNickname = async (searchTerm, options = {}) => (
    applySession(
        User.countDocuments(activeNicknameFilter(searchTerm)),
        options
    )
);

const searchActiveByNickname = async (
    searchTerm,
    { page, limit },
    options = {}
) => (
    applySession(
        User.find(activeNicknameFilter(searchTerm))
            .sort({ nickname: 1, _id: 1 })
            .skip(getPaginationOffset(page, limit))
            .limit(limit)
            .select('nickname name'),
        options
    )
);

const create = async (userData, options = {}) => {
    if (!options.session) {
        return User.create(userData);
    }

    const [user] = await User.create([userData], {
        session: options.session
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
    findAllActive,
    findByEmail,
    findById,
    findByNickname,
    searchActiveByNickname,
    updateById
};
