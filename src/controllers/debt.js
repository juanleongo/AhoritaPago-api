const {response}= require('express')
const debtService = require('../services/debtservice');

// Obtener todas las deudas
const getAllDebts = async (req, res=response) => {
    try {
        const debts = await debtService.getAllDebts(req.user.userId);
        res.json(debts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener una deuda por ID
const getDebtById = async (req, res) => {
    try {
    
        const debt = await debtService.getDebtById(req.params.id);
        if (!debt) {
            return res.status(404).json({ message: 'Deuda no encontrada' });
        }
        res.status(200).json(debt);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crear una nueva deuda
const createDebt = async (req, res) => {
    try {
        const debt = await debtService.createDebt(req.body,req.user);
        res.status(201).json(debt);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Actualizar una deuda
const updateDebt = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await debtService.updateDebt(id, req.body);
        if (!updated) {
            return res.status(404).json({ message: 'Deuda no encontrada' });
        }
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar una deuda
const deleteDebt = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await debtService.deleteDebt(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Deuda no encontrada' });
        }
        res.json({ message: 'Deuda eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Marcar una deuda como pagada
const markAsPay = async (req, res) => {
    try {
        //const { id,group} = req.body;
        const userId = req.user.userId;
        const paidDebt = await debtService.markAsPaid(req.params.id, userId);
        if (!paidDebt) {
            return res.status(404).json({ message: 'Deuda no encontrada' });
        }
        res.json({ message: 'Deuda marcada como pagada', debt: paidDebt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getDebtSummary = async (req = request, res = response) => {
    try {
        // Obtenemos el ID del token JWT
        const summary = await debtService.getDebtSummaryForUser(req.user.userId);

        res.status(200).json({
            msg: 'Resumen financiero obtenido con éxito.',
            summary
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Hubo un error al generar el resumen.' });
    }
};

module.exports = {
    getAllDebts,
    getDebtById,
    createDebt,
    updateDebt,
    deleteDebt,
    markAsPay,
    getDebtSummary
};
