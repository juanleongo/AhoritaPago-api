const createGetDebtSummaryForUser = ({ debtRepository }) => {
    const getDebtSummaryForUser = async userId => {
        const transactions = await debtRepository
            .findActiveByParticipant(userId);
        const summary = {
            debts: [],
            credits: []
        };

        transactions.forEach(transaction => {
            const isCreditor = transaction.creditor
                ? transaction.creditor._id.toString() === userId
                : false;
            const debtorIds = transaction.debtor.map(
                user => user._id.toString()
            );

            if (debtorIds.includes(userId)) {
                summary.debts.push({
                    description: transaction.description,
                    group: transaction.group
                        ? transaction.group.name
                        : 'Sin Grupo',
                    date: transaction.debtDate,
                    amount: transaction.value,
                    with: transaction.creditor
                        ? transaction.creditor.name
                        : 'Acreedor no encontrado'
                });
            }

            if (isCreditor) {
                summary.credits.push({
                    description: transaction.description,
                    group: transaction.group
                        ? transaction.group.name
                        : 'Sin Grupo',
                    date: transaction.debtDate,
                    amount: transaction.value,
                    with: transaction.debtor.length > 0
                        ? transaction.debtor[0].name
                        : 'Deudor no encontrado'
                });
            }
        });

        return summary;
    };

    return getDebtSummaryForUser;
};

module.exports = { createGetDebtSummaryForUser };
