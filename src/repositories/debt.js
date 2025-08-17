const Debt = require('../models/debt');

const createDebt = async (debtData) => {
    return await Debt.create(debtData);
};

const deleteDebt = async (id) => {
    // Usamos findByIdAndDelete en lugar de una actualización de estado
    return await Debt.findByIdAndDelete(id);
};

const updateDebt = async (id, debtData) => {
    return await Debt.findByIdAndUpdate(id, debtData, { new: true });
};

const getAllDebtsForUser = async (userId) => {
    return await Debt.find({ debtor: userId, state: true })
        .populate('debtor', 'name')
        .populate('creditor', 'name');
};

const getDebtById = async (id) => {
    return await Debt.findById(id);
};

const findDebtsAndCreditsByUserId = async (userId) => {
    return await Debt.find({
        $or: [
            { creditor: userId },
            { debtor: userId }
        ],
        state: true 
    }).populate('group', 'name');
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