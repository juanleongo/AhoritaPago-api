const getUserId = user => user?._id ?? user?.uid;

const toPublicUser = user => {
    if (typeof user?.toJSON === 'function') {
        return user.toJSON();
    }

    const {
        _id,
        __v,
        password,
        ...publicUser
    } = user || {};

    if (publicUser.uid === undefined && _id !== undefined) {
        publicUser.uid = _id;
    }

    return publicUser;
};

const normalizeBalance = balance => ({
    owe: Number.isFinite(balance?.owe) ? balance.owe : 0,
    owes: Number.isFinite(balance?.owes) ? balance.owes : 0
});

const createBalanceService = ({ debtRepository }) => {
    const getActiveBalanceForUser = async (userId, options = {}) => (
        normalizeBalance(
            await debtRepository.getActiveBalanceByUserId(userId, options)
        )
    );

    const withActiveBalance = async (user, options = {}) => {
        const balance = await getActiveBalanceForUser(
            getUserId(user),
            options
        );

        return {
            ...toPublicUser(user),
            ...balance
        };
    };

    return {
        getActiveBalanceForUser,
        withActiveBalance
    };
};

module.exports = { createBalanceService };
