const { PAGINATION } = require('../../config/pagination');
const { createPaginationMetadata } = require('../../helpers/pagination');

const createGetAllDebts = ({ debtRepository }) => {
    const getAllDebts = async (userId, pagination = {}) => {
        const page = pagination.page ?? PAGINATION.defaultPage;
        const limit = pagination.limit ?? PAGINATION.defaultLimit;
        const [debts, count] = await Promise.all([
            debtRepository.findActiveByDebtor(userId, { page, limit }),
            debtRepository.countActiveByDebtor(userId)
        ]);

        return {
            count,
            pagination: createPaginationMetadata(count, page, limit),
            debts
        };
    };

    return getAllDebts;
};

module.exports = { createGetAllDebts };
