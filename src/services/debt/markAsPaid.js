const { createHttpError } = require('../../helpers/httpError');

const createMarkAsPaid = ({
    debtAccess,
    debtRepository,
    transactionManager,
    userService
}) => {
    const markAsPaid = async (id, userId) => (
        transactionManager.runInTransaction(async transaction => {
            const debt = await debtAccess.getExistingDebt(id, transaction);
            const isDebtor = debtAccess.isDebtDebtor(debt, userId);
            const isCreditor = debtAccess.isDebtCreditor(debt, userId);

            if (!isDebtor && !isCreditor) {
                throw createHttpError(
                    403,
                    'No estás autorizado para marcar esta deuda como pagada',
                    'DEBT_PAYMENT_FORBIDDEN'
                );
            }

            if (!debt.state) {
                throw createHttpError(
                    409,
                    'La deuda ya fue marcada como pagada',
                    'DEBT_ALREADY_PAID'
                );
            }

            await userService.incrementUserBalances(
                debtAccess.toIdString(debt.creditor),
                { owes: -debt.value },
                transaction
            );

            for (const debtorId of debt.debtor) {
                await userService.incrementUserBalances(
                    debtAccess.toIdString(debtorId),
                    { owe: -debt.value },
                    transaction
                );
            }

            return debtRepository.updateById(
                id,
                {
                    paymentDate: Date.now(),
                    state: false
                },
                { transaction }
            );
        })
    );

    return markAsPaid;
};

module.exports = { createMarkAsPaid };
