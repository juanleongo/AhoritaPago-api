const { createHttpError } = require('../../helpers/httpError');

const createMarkAsPaid = ({
    debtAccess,
    debtRepository,
    transactionManager
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
