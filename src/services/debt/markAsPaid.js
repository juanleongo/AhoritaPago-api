const { createHttpError } = require('../../helpers/httpError');

const createMarkAsPaid = ({
    debtAccess,
    debtRepository,
    mongoose,
    userService
}) => {
    const markAsPaid = async (id, userId) => {
        const session = await mongoose.startSession();
        let paidDebt;

        try {
            await session.withTransaction(async () => {
                const debt = await debtAccess.getExistingDebt(id, session);
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
                    session
                );

                for (const debtorId of debt.debtor) {
                    await userService.incrementUserBalances(
                        debtAccess.toIdString(debtorId),
                        { owe: -debt.value },
                        session
                    );
                }

                paidDebt = await debtRepository.updateById(
                    id,
                    {
                        paymentDate: Date.now(),
                        state: false
                    },
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        return paidDebt;
    };

    return markAsPaid;
};

module.exports = { createMarkAsPaid };
