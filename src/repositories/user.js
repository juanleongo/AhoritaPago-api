const User = require('../models/user');
const { escapeRegex } = require('../helpers/escapeRegex');
const {
    applySession,
    buildWriteOptions
} = require('./repositoryOptions');

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

const searchActiveByNickname = async (searchTerm, options = {}) => {
    const regex = new RegExp(escapeRegex(searchTerm), 'i');

    return applySession(
        User.find({ nickname: regex, state: true }).select('nickname name'),
        options
    );
};

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
    User.findByIdAndUpdate(
        id,
        { state: false },
        buildWriteOptions(options, { new: true })
    )
);

module.exports = {
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
