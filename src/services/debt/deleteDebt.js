const { createHttpError } = require('../../helpers/httpError');

const createDeleteDebt = ({
    debtAccess,
    debtRepository,
    transactionManager
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

            return debtRepository.deleteById(id, { transaction });
        })
    );

    return deleteDebt;
};

module.exports = { createDeleteDebt };
