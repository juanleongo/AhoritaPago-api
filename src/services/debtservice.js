const debtRepository = require("../repositories/debt");
const userService = require("../services/userService");
const groupRepository = require("../repositories/group");

const getAllDebts = async (userId) => {
    return await debtRepository.getAllDebtsForUser(userId);
};


const getDebtById = async (id) => {
    return await debtRepository.getDebtById(id);
};

const createDebt = async (debtData, creditorData) => {
    // Renombramos 'debtor' a 'debtors' para mayor claridad
    const { description, debtor: debtors, value, group } = debtData;

    if (!description || !value || !debtors || !Array.isArray(debtors) || debtors.length === 0) {

        throw new Error("Se requiere una descripción, un valor y una lista de deudores.");
    }

    const createdDebts = [];
    const creditorId = creditorData.userId;
    // Calculamos el monto total que se le acreditará al acreedor.
    const totalCreditValue = value * debtors.length;

    // Usamos Promise.all para ejecutar todas las operaciones de forma concurrente,
    // lo que es más eficiente que un bucle con await.
    await Promise.all(
        debtors.map(async (debtorId) => {
            // Preparamos los datos para la nueva deuda individual
            const newDebtData = {
                description,
                value, // El valor es por persona
                debtor: [debtorId], // El array de deudores ahora contiene un solo ID
                group,
                debtDate: Date.now(),
                creditor: creditorId,
            };

            // 1. Creamos el documento de deuda individual en la BD
            const createdDebt = await debtRepository.createDebt(newDebtData);
            createdDebts.push(createdDebt);

            // 2. Actualizamos el saldo 'owe' del deudor individual
            await userService.updateUser(debtorId, { $inc: { owe: value } });
        })
    );

    // 3. Actualizamos el saldo 'owes' del acreedor una sola vez con el monto total
    await userService.updateUser(creditorId, { $inc: { owes: totalCreditValue } });

    // Devolvemos el array con todas las deudas que se crearon
    return createdDebts;
};


const updateDebt = async (id, debtData) => {
    return await debtRepository.updateDebt(id, debtData);
};

const deleteDebt = async (id) => {
    return await debtRepository.deleteDebt(id);
};

const markAsPaid = async (id, userId) => {
    const debt = await debtRepository.getDebtById(id);

    if (!debt) {
        throw new Error("Deuda no encontrada");
    }

    const isDebtor = debt.debtor.some((debtorId) => debtorId.toString() === userId);
    const isCreditor = debt.creditor.toString() === userId;

    if (!isDebtor && !isCreditor) {
        throw new Error("No estás autorizado para marcar esta deuda como pagada");
    }

    const value = debt.value;
    userService.updateUser(debt.creditor.toString(), { $inc: { owes: -value } });
    
  
    debt.debtor.forEach(debtorId => {
         userService.updateUser(debtorId.toString(), { $inc: { owe: -value } });
    });

    const updatedDebtData = {
        paymentDate: Date.now(),
        state: false
    };

    return await debtRepository.updateDebt(id, updatedDebtData);
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
        throw new Error("El grupo con ese código no fue encontrado.");
    }

    // Opcional: Verificar si el usuario es miembro del grupo antes de buscar deudas.
    const isMember = group.members.some(memberId => memberId.toString() === userId);
    if (!isMember) {
        throw new Error("No eres miembro de este grupo.");
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