const { createHttpError } = require('../../helpers/httpError');

const validateDebtInput = (debtData, creditorId) => {
    const { description, debtor: debtors, value, group } = debtData;

    if (
        !description
        || !value
        || !group
        || !Array.isArray(debtors)
        || debtors.length === 0
    ) {
        throw createHttpError(
            400,
            'Se requiere una descripción, un valor, un grupo y una lista de deudores.',
            'DEBT_REQUIRED_FIELDS_MISSING'
        );
    }

    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw createHttpError(
            400,
            'El valor de la deuda debe ser un número mayor que cero.',
            'DEBT_VALUE_INVALID'
        );
    }

    if (debtors.some(debtorId => !debtorId)) {
        throw createHttpError(
            400,
            'La lista de deudores contiene identificadores inválidos',
            'DEBTOR_ID_INVALID'
        );
    }

    const uniqueDebtorIds = [
        ...new Set(debtors.map(debtorId => debtorId.toString()))
    ];

    if (uniqueDebtorIds.length !== debtors.length) {
        throw createHttpError(
            400,
            'La lista de deudores contiene usuarios repetidos',
            'DEBTOR_DUPLICATED'
        );
    }

    if (uniqueDebtorIds.includes(creditorId.toString())) {
        throw createHttpError(
            400,
            'El acreedor no puede registrarse como deudor',
            'CREDITOR_CANNOT_BE_DEBTOR'
        );
    }

    return uniqueDebtorIds;
};

const createCreateDebt = ({
    debtAccess,
    debtRepository,
    groupRepository,
    mongoose,
    userService
}) => {
    const assertGroupParticipants = (
        targetGroup,
        creditorId,
        debtorIds
    ) => {
        if (!targetGroup || !targetGroup.state) {
            throw createHttpError(
                404,
                'Grupo no encontrado',
                'GROUP_NOT_FOUND'
            );
        }

        const memberIds = new Set(
            targetGroup.members.map(debtAccess.toIdString)
        );

        if (!memberIds.has(creditorId.toString())) {
            throw createHttpError(
                403,
                'No puedes crear deudas en un grupo al que no perteneces',
                'DEBT_CREATE_FORBIDDEN'
            );
        }

        if (debtorIds.some(debtorId => !memberIds.has(debtorId))) {
            throw createHttpError(
                403,
                'Todos los deudores deben pertenecer al grupo',
                'DEBTOR_NOT_GROUP_MEMBER'
            );
        }
    };

    const createDebt = async (debtData, creditorData) => {
        const { description, value, group } = debtData;
        const creditorId = creditorData.userId;
        const debtorIds = validateDebtInput(debtData, creditorId);
        const totalCreditValue = value * debtorIds.length;
        const session = await mongoose.startSession();
        let createdDebts = [];

        try {
            await session.withTransaction(async () => {
                const targetGroup = await groupRepository.findActiveById(
                    group,
                    { session }
                );

                assertGroupParticipants(targetGroup, creditorId, debtorIds);

                const transactionDebts = [];

                for (const debtorId of debtorIds) {
                    const newDebtData = {
                        description,
                        value,
                        debtor: [debtorId],
                        group,
                        debtDate: Date.now(),
                        creditor: creditorId
                    };

                    const createdDebt = await debtRepository.create(
                        newDebtData,
                        { session }
                    );
                    transactionDebts.push(createdDebt);

                    await userService.incrementUserBalances(
                        debtorId,
                        { owe: value },
                        session
                    );
                }

                await userService.incrementUserBalances(
                    creditorId,
                    { owes: totalCreditValue },
                    session
                );

                createdDebts = transactionDebts;
            });
        } finally {
            await session.endSession();
        }

        return createdDebts;
    };

    return createDebt;
};

module.exports = { createCreateDebt };
