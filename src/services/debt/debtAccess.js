const { createHttpError } = require('../../helpers/httpError');

const toIdString = value => {
    if (!value) return null;
    return (value._id || value).toString();
};

const isDebtCreditor = (debt, userId) => (
    toIdString(debt.creditor) === userId.toString()
);

const isDebtDebtor = (debt, userId) => (
    debt.debtor.some(
        debtorId => toIdString(debtorId) === userId.toString()
    )
);

const createDebtAccess = ({ debtRepository }) => {
    const getExistingDebt = async (id, transaction = null) => {
        const debt = await debtRepository.findById(id, { transaction });

        if (!debt) {
            throw createHttpError(
                404,
                'Deuda no encontrada',
                'DEBT_NOT_FOUND'
            );
        }

        return debt;
    };

    return {
        getExistingDebt,
        isDebtCreditor,
        isDebtDebtor,
        toIdString
    };
};

module.exports = {
    createDebtAccess,
    isDebtCreditor,
    isDebtDebtor,
    toIdString
};
