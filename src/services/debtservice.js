const debtRepository = require("../repositories/debt");
const userService = require("../services/userService");
const groupRepository = require("../repositories/group");
const { createHttpError } = require("../helpers/httpError");
const mongoose = require("mongoose");

const toIdString = (value) => {
    if (!value) return null;
    return (value._id || value).toString();
};

const isDebtCreditor = (debt, userId) => (
    toIdString(debt.creditor) === userId.toString()
);

const isDebtDebtor = (debt, userId) => (
    debt.debtor.some(debtorId => toIdString(debtorId) === userId.toString())
);

const getExistingDebt = async (id, session = null) => {
    const debt = await debtRepository.getDebtById(id, session);

    if (!debt) {
        throw createHttpError(404, "Deuda no encontrada");
    }

    return debt;
};

const getAllDebts = async (userId) => {
    return await debtRepository.getAllDebtsForUser(userId);
};


const getDebtById = async (id, userId) => {
    const debt = await getExistingDebt(id);

    if (!isDebtCreditor(debt, userId) && !isDebtDebtor(debt, userId)) {
        throw createHttpError(403, "No tienes permiso para consultar esta deuda");
    }

    return debt;
};

const createDebt = async (debtData, creditorData) => {
    // Renombramos 'debtor' a 'debtors' para mayor claridad
    const { description, debtor: debtors, value, group } = debtData;

    if (!description || !value || !group || !debtors || !Array.isArray(debtors) || debtors.length === 0) {

        throw createHttpError(400, "Se requiere una descripción, un valor, un grupo y una lista de deudores.");
    }

    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw createHttpError(400, "El valor de la deuda debe ser un número mayor que cero.");
    }

    const creditorId = creditorData.userId;

    if (debtors.some(debtorId => !debtorId)) {
        throw createHttpError(400, "La lista de deudores contiene identificadores inválidos");
    }

    const uniqueDebtorIds = [...new Set(debtors.map(debtorId => debtorId.toString()))];

    if (uniqueDebtorIds.length !== debtors.length) {
        throw createHttpError(400, "La lista de deudores contiene usuarios repetidos");
    }

    if (uniqueDebtorIds.includes(creditorId.toString())) {
        throw createHttpError(400, "El acreedor no puede registrarse como deudor");
    }

    const totalCreditValue = value * uniqueDebtorIds.length;
    const session = await mongoose.startSession();
    let createdDebts = [];

    try {
        await session.withTransaction(async () => {
            const targetGroup = await groupRepository.getGroupyId(group, session);

            if (!targetGroup || !targetGroup.state) {
                throw createHttpError(404, "Grupo no encontrado");
            }

            const memberIds = new Set(targetGroup.members.map(toIdString));

            if (!memberIds.has(creditorId.toString())) {
                throw createHttpError(403, "No puedes crear deudas en un grupo al que no perteneces");
            }

            if (uniqueDebtorIds.some(debtorId => !memberIds.has(debtorId))) {
                throw createHttpError(403, "Todos los deudores deben pertenecer al grupo");
            }

            const transactionDebts = [];

            // Las operaciones se ejecutan en serie porque una misma sesión de
            // MongoDB no admite operaciones paralelas dentro de una transacción.
            for (const debtorId of uniqueDebtorIds) {
                const newDebtData = {
                    description,
                    value,
                    debtor: [debtorId],
                    group,
                    debtDate: Date.now(),
                    creditor: creditorId,
                };

                const createdDebt = await debtRepository.createDebt(newDebtData, session);
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


const updateDebt = async (id, debtData, userId) => {
    const debt = await getExistingDebt(id);

    if (!isDebtCreditor(debt, userId)) {
        throw createHttpError(403, "Solo el acreedor puede modificar esta deuda");
    }

    if (!debt.state) {
        throw createHttpError(400, "No se puede modificar una deuda pagada");
    }

    if (!Object.prototype.hasOwnProperty.call(debtData, 'description')) {
        throw createHttpError(400, "Solo se permite actualizar la descripción de la deuda");
    }

    return await debtRepository.updateDebt(id, { description: debtData.description });
};

const deleteDebt = async (id, userId) => {
    const session = await mongoose.startSession();
    let deletedDebt;

    try {
        await session.withTransaction(async () => {
            const debt = await getExistingDebt(id, session);

            if (!isDebtCreditor(debt, userId)) {
                throw createHttpError(403, "Solo el acreedor puede eliminar esta deuda");
            }

            // Una deuda pendiente todavía está reflejada en los saldos.
            // Antes de eliminarla se revierten esos valores en la misma transacción.
            if (debt.state) {
                await userService.incrementUserBalances(
                    toIdString(debt.creditor),
                    { owes: -debt.value },
                    session
                );

                for (const debtorId of debt.debtor) {
                    await userService.incrementUserBalances(
                        toIdString(debtorId),
                        { owe: -debt.value },
                        session
                    );
                }
            }

            deletedDebt = await debtRepository.deleteDebt(id, session);
        });
    } finally {
        await session.endSession();
    }

    return deletedDebt;
};

const markAsPaid = async (id, userId) => {
    const session = await mongoose.startSession();
    let paidDebt;

    try {
        await session.withTransaction(async () => {
            const debt = await getExistingDebt(id, session);
            const isDebtor = isDebtDebtor(debt, userId);
            const isCreditor = isDebtCreditor(debt, userId);

            if (!isDebtor && !isCreditor) {
                throw createHttpError(403, "No estás autorizado para marcar esta deuda como pagada");
            }

            if (!debt.state) {
                throw createHttpError(400, "La deuda ya fue marcada como pagada");
            }

            const value = debt.value;

            await userService.incrementUserBalances(
                toIdString(debt.creditor),
                { owes: -value },
                session
            );

            for (const debtorId of debt.debtor) {
                await userService.incrementUserBalances(
                    toIdString(debtorId),
                    { owe: -value },
                    session
                );
            }

            paidDebt = await debtRepository.updateDebt(
                id,
                {
                    paymentDate: Date.now(),
                    state: false
                },
                session
            );
        });
    } finally {
        await session.endSession();
    }

    return paidDebt;
};

const getDebtSummaryForUser = async (userId) => {
    const transactions = await debtRepository.findDebtsAndCreditsByUserId(userId);
    

    const summary = {
        debts: [],
        credits: []
    };

    transactions.forEach(tx => {
        let involvedUser = 'Usuario Desconocido';
        
        // --- INICIO DE LA CORRECCIÓN ---

        // Accedemos a la propiedad ._id ANTES de convertir a string
        const isCreditor = tx.creditor ? tx.creditor._id.toString() === userId : false; // <-- CORRECCIÓN

        // Hacemos lo mismo para el array de deudores
        const debtorsAsStrings = tx.debtor.map(userObj => userObj._id.toString()); // <-- CORRECCIÓN
        
        // --- FIN DE LA CORRECCIÓN ---

        if (debtorsAsStrings.includes(userId)) {
            involvedUser = tx.creditor ? tx.creditor.name : 'Acreedor no encontrado';
            summary.debts.push({
                description: tx.description,
                group: tx.group ? tx.group.name : 'Sin Grupo',
                date: tx.debtDate,
                amount: tx.value,
                with: involvedUser
            });
        }
        
        if (isCreditor) {
            involvedUser = tx.debtor.length > 0 ? tx.debtor[0].name : 'Deudor no encontrado';
            summary.credits.push({
                description: tx.description,
                group: tx.group ? tx.group.name : 'Sin Grupo',
                date: tx.debtDate,
                amount: tx.value,
                with: involvedUser
            });
        }
    });

    return summary;
};
const getDebtsForUserInGroupByCode = async (userId, groupCode) => {
    // 1. Encontrar el grupo usando su código para obtener el ID.
    const group = await groupRepository.getGroupByCode(groupCode);

    if (!group) {
        throw createHttpError(404, "El grupo con ese código no fue encontrado.");
    }

    // Opcional: Verificar si el usuario es miembro del grupo antes de buscar deudas.
    const isMember = group.members.some(memberId => memberId.toString() === userId);
    if (!isMember) {
        throw createHttpError(403, "No eres miembro de este grupo.");
    }

    // 2. Usar el ID del grupo para buscar las deudas.
    const debtsInGroup = await debtRepository.findDebtsForUserInGroup(userId, group._id);

    return debtsInGroup;
};


module.exports = {
    getAllDebts,
    getDebtById,
    createDebt,
    updateDebt,
    deleteDebt,
    markAsPaid,
    getDebtSummaryForUser,
    getDebtsForUserInGroupByCode
};
