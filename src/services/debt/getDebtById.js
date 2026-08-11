const { createHttpError } = require('../../helpers/httpError');

const createGetDebtById = ({ debtAccess }) => {
    const getDebtById = async (id, userId) => {
        const debt = await debtAccess.getExistingDebt(id);

        if (
            !debtAccess.isDebtCreditor(debt, userId)
            && !debtAccess.isDebtDebtor(debt, userId)
        ) {
            throw createHttpError(
                403,
                'No tienes permiso para consultar esta deuda',
                'DEBT_ACCESS_FORBIDDEN'
            );
        }

        return debt;
    };

    return getDebtById;
};

module.exports = { createGetDebtById };
