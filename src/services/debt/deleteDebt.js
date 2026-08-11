const { createHttpError } = require('../../helpers/httpError');

const createDeleteDebt = ({
    debtAccess,
    debtRepository,
    transactionManager,
    userService
}) => {
    const deleteDebt = async (id, userId) => (
        transactionManager.runInTransaction(async transaction => {
            const debt = await debtAccess.getExistingDebt(id, transaction);

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
                    transaction
                );

                for (const debtorId of debt.debtor) {
                    await userService.incrementUserBalances(
                        debtAccess.toIdString(debtorId),
                        { owe: -debt.value },
                        transaction
                    );
                }
            }

            return debtRepository.deleteById(id, { transaction });
        })
    );

    return deleteDebt;
};

module.exports = { createDeleteDebt };
