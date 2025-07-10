const Debt = require("../models/debt");

const userService = require("../services/userService");

// 🔹 Obtener todas las deudas
const getAllDebts = async (userId) => {
   const debts = await Debt.find({   debtor: userId, 
      state: true  })
    .populate('debtor', 'name ') // Pobla los datos del deudor (opcional)
    .populate('creditor', 'name '); // Pobla los datos del acreedor (si lo tienes)

  return debts;
};

// 🔹 Obtener una deuda por ID
const getDebtById = async (id) => {
  return await Debt.findById(id).populate("debtor", "name email");
};

// 🔹 Crear una nueva deuda
const createDebt = async (debtData, creditorData) => {
  const { description, debtor, value,group } = debtData;

  if (!description || !debtor || !value) {
    throw new Error("Descripción,valor y deudor son obligatorios");
  }

  const newDebt = new Debt({
    description,
    value,
    debtor,
    group,
    debtDate: Date.now(),
    creditor: creditorData.userId,
  });

  userService.updateUser(debtor, { $inc: { owe: value } });
  userService.updateUser(creditorData.userId, { $inc: { owes: value } });
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

const markAsPaid = async (id, userId) => {
  const debt = await Debt.findById(id);

  if (!debt) {
    throw new Error("Deuda no encontrada");
  }

  const isDebtor = debt.debtor.some(
    (debtorId) => debtorId.toString() === userId
  );
  const isCreditor = debt.creditor.toString() === userId;
  const value = debt.value


  if (!isDebtor && !isCreditor) {
    throw new Error("No estás autorizado para marcar esta deuda como pagada");
  }
  userService.updateUser(debt.creditor.toString(), { $inc: { owes: -value } });
  userService.updateUser(debt.debtor.toString(), { $inc: { owe: -value } });
  debt.paymentDate = Date.now();
  debt.state= false
  return await debt.save();
};
module.exports = {
  getAllDebts,
  getDebtById,
  createDebt,
  updateDebt,
  deleteDebt,
  markAsPaid,
};
