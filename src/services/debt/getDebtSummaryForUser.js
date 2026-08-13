const { PAGINATION } = require('../../config/pagination');
const { createPaginationMetadata } = require('../../helpers/pagination');

const toDebtSummaryItem = transaction => ({
    description: transaction.description,
    group: transaction.group ? transaction.group.name : 'Sin Grupo',
    date: transaction.debtDate,
    amount: transaction.value,
    with: transaction.creditor
        ? transaction.creditor.name
        : 'Acreedor no encontrado'
});

const toCreditSummaryItem = transaction => ({
    description: transaction.description,
    group: transaction.group ? transaction.group.name : 'Sin Grupo',
    date: transaction.debtDate,
    amount: transaction.value,
    with: transaction.debtor.length > 0
        ? transaction.debtor[0].name
        : 'Deudor no encontrado'
});

const createGetDebtSummaryForUser = ({ debtRepository }) => {
    const getDebtSummaryForUser = async (userId, pagination = {}) => {
        const debtsPage = (
            pagination.debtsPage ?? PAGINATION.defaultPage
        );
        const creditsPage = (
            pagination.creditsPage ?? PAGINATION.defaultPage
        );
        const limit = pagination.limit ?? PAGINATION.defaultLimit;
        const [debtTransactions, creditTransactions, debtsTotal, creditsTotal]
            = await Promise.all([
                debtRepository.findActiveByDebtor(userId, {
                    page: debtsPage,
                    limit
                }),
                debtRepository.findActiveByCreditor(userId, {
                    page: creditsPage,
                    limit
                }),
                debtRepository.countActiveByDebtor(userId),
                debtRepository.countActiveByCreditor(userId)
            ]);

        return {
            count: {
                total: debtsTotal + creditsTotal,
                debts: debtsTotal,
                credits: creditsTotal
            },
            pagination: {
                debts: createPaginationMetadata(
                    debtsTotal,
                    debtsPage,
                    limit
                ),
                credits: createPaginationMetadata(
                    creditsTotal,
                    creditsPage,
                    limit
                )
            },
            debts: debtTransactions.map(toDebtSummaryItem),
            credits: creditTransactions.map(toCreditSummaryItem)
        };
    };

    return getDebtSummaryForUser;
};

module.exports = { createGetDebtSummaryForUser };
