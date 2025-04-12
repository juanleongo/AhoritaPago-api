const Debt = require('../models/debt');

// 🔹 Obtener todas las deudas
const getAllDebts = async () => {
    return await Debt.find().populate('debtor', 'name email');
};

// 🔹 Obtener una deuda por ID
const getDebtById = async (id) => {
    return await Debt.findById(id).populate('debtor', 'name email');
};

// 🔹 Crear una nueva deuda
const createDebt = async (debtData) => {
    const newDebt = new Debt(debtData);
    return await newDebt.save();
};

// 🔹 Actualizar una deuda
const updateDebt = async (id, debtData) => {
    return await Debt.findByIdAndUpdate(id, debtData, { new: true });
};

// 🔹 Eliminar una deuda
const deleteDebt = async (id) => {
    return await Debt.findByIdAndDelete(id);
};

// 🔹 Marcar una deuda como pagada
const markAsPaid = async (id) => {
    return await Debt.findByIdAndUpdate(id, { paymentDate: Date.now() }, { new: true });
};

module.exports = {
    getAllDebts,
    getDebtById,
    createDebt,
    updateDebt,
    deleteDebt,
    markAsPaid
};
