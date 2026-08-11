const { PAGINATION } = require('../../config/pagination');
const { createPaginationMetadata } = require('../../helpers/pagination');

const createGetDebtHistoryForUser = ({ debtRepository }) => {
    const getDebtHistoryForUser = async (userId, pagination = {}) => {
        const activePage = pagination.activePage ?? PAGINATION.defaultPage;
        const paidPage = pagination.paidPage ?? PAGINATION.defaultPage;
        const limit = pagination.limit ?? PAGINATION.defaultLimit;

        const [active, paid, activeTotal, paidTotal] = await Promise.all([
            debtRepository.findHistoryByParticipant(userId, {
                state: true,
                page: activePage,
                limit
            }),
            debtRepository.findHistoryByParticipant(userId, {
                state: false,
                page: paidPage,
                limit
            }),
            debtRepository.countHistoryByParticipant(userId, {
                state: true
            }),
            debtRepository.countHistoryByParticipant(userId, {
                state: false
            })
        ]);

        return {
            count: {
                total: activeTotal + paidTotal,
                active: activeTotal,
                paid: paidTotal
            },
            pagination: {
                active: createPaginationMetadata(
                    activeTotal,
                    activePage,
                    limit
                ),
                paid: createPaginationMetadata(
                    paidTotal,
                    paidPage,
                    limit
                )
            },
            active,
            paid
        };
    };

    return getDebtHistoryForUser;
};

module.exports = { createGetDebtHistoryForUser };
