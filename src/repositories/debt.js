const Debt = require('../models/debt');

const createDebt = async (debtData, session = null) => {
    const debt = new Debt(debtData);
    return await debt.save({ session });
};

const deleteDebt = async (id, session = null) => {
    return await Debt.findByIdAndDelete(id, { session });
};

const updateDebt = async (id, debtData, session = null) => {
    return await Debt.findByIdAndUpdate(
        id,
        debtData,
        { new: true, runValidators: true, session }
    );
};

const getAllDebtsForUser = async (userId) => {
    return await Debt.find({ debtor: userId, state: true })
        .populate('debtor', 'name')
        .populate('creditor', 'name');
};

const getDebtById = async (id, session = null) => {
    return await Debt.findById(id).session(session);
};

const findDebtsAndCreditsByUserId = async (userId) => {
    return await Debt.find({
        $or: [
            { creditor: userId },
            { debtor: userId }
        ],
        state: true
    })
    // ¡Esta es la parte clave!
    // .populate() reemplaza los IDs de los usuarios con sus documentos completos.
    .populate('group', 'name')
    .populate('creditor', 'name nickname') // Traemos nombre y nickname del acreedor
    .populate('debtor', 'name nickname');   // Traemos nombre y nickname del deudor
};

const findDebtsForUserInGroup = async (userId, groupId) => {
    return await Debt.find({
        group: groupId,
        state: true,
        $or: [
            { creditor: userId },
            { debtor: userId }
        ]
    }).populate('creditor', 'name nickname').populate('debtor', 'name nickname'); // Traemos más info útil
};
module.exports = {
    createDebt,
    deleteDebt,
    updateDebt,
    getAllDebtsForUser,
    getDebtById,
    findDebtsAndCreditsByUserId,
    findDebtsForUserInGroup
};
