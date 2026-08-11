const newestFirst = dateField => (firstDebt, secondDebt) => {
    const firstDate = firstDebt[dateField] || firstDebt.debtDate;
    const secondDate = secondDebt[dateField] || secondDebt.debtDate;

    return new Date(secondDate).getTime() - new Date(firstDate).getTime();
};

const createGetDebtHistoryForUser = ({ debtRepository }) => {
    const getDebtHistoryForUser = async userId => {
        const debts = await debtRepository.findHistoryByParticipant(userId);

        const active = debts
            .filter(debt => debt.state)
            .sort(newestFirst('debtDate'));

        const paid = debts
            .filter(debt => !debt.state)
            .sort(newestFirst('paymentDate'));

        return { active, paid };
    };

    return getDebtHistoryForUser;
};

module.exports = { createGetDebtHistoryForUser };
