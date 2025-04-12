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
const createDebt = async (debtData,creditorData) => {
    const { description, debtor } = debtData;

    if (!description || !debtor) {
        throw new Error('Descripción y deudor son obligatorios');
    }

    const newDebt = new Debt({
        description,
        debtor,
        debtDate: Date.now(),
        creditor:creditorData.userId
    });

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
    const debt = await Debt.findById(id);

    if (!debt) {
        throw new Error('Deuda no encontrada');
    }

    debt.paymentDate = Date.now();
    return await debt.save();
};

module.exports = {
    getAllDebts,
    getDebtById,
    createDebt,
    updateDebt,
    deleteDebt,
    markAsPaid
};
