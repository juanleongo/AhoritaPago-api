const { createHttpError } = require('../../helpers/httpError');

const createUpdateDebt = ({ debtAccess, debtRepository }) => {
    const updateDebt = async (id, debtData, userId) => {
        const debt = await debtAccess.getExistingDebt(id);

        if (!debtAccess.isDebtCreditor(debt, userId)) {
            throw createHttpError(
                403,
                'Solo el acreedor puede modificar esta deuda',
                'DEBT_UPDATE_FORBIDDEN'
            );
        }

        if (!debt.state) {
            throw createHttpError(
                400,
                'No se puede modificar una deuda pagada',
                'PAID_DEBT_UPDATE_INVALID'
            );
        }

        if (!Object.prototype.hasOwnProperty.call(debtData, 'description')) {
            throw createHttpError(
                400,
                'Solo se permite actualizar la descripción de la deuda',
                'DEBT_UPDATE_FIELDS_INVALID'
            );
        }

        return debtRepository.updateDebt(
            id,
            { description: debtData.description }
        );
    };

    return updateDebt;
};

module.exports = { createUpdateDebt };
