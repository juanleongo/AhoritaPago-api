const { createHttpError } = require('../../helpers/httpError');

const createDeleteDebt = ({
    debtAccess,
    debtRepository,
    mongoose,
    userService
}) => {
    const deleteDebt = async (id, userId) => {
        const session = await mongoose.startSession();
        let deletedDebt;

        try {
            await session.withTransaction(async () => {
                const debt = await debtAccess.getExistingDebt(id, session);

                if (!debtAccess.isDebtCreditor(debt, userId)) {
                    throw createHttpError(
                        403,
                        'Solo el acreedor puede eliminar esta deuda',
                        'DEBT_DELETE_FORBIDDEN'
                    );
                }

                if (debt.state) {
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
                }

                deletedDebt = await debtRepository.deleteById(
                    id,
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        return deletedDebt;
    };

    return deleteDebt;
};

module.exports = { createDeleteDebt };
