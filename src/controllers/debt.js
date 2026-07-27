const debtService = require('../services/debtservice');
const { asyncHandler } = require('../middlewares/asyncHandler');

const getAllDebts = asyncHandler(async (req, res) => {
    const debts = await debtService.getAllDebts(req.user.userId);
    res.status(200).json(debts);
});

const getDebtById = asyncHandler(async (req, res) => {
    const debt = await debtService.getDebtById(
        req.params.id,
        req.user.userId
    );

    res.status(200).json(debt);
});

const createDebt = asyncHandler(async (req, res) => {
    const debt = await debtService.createDebt(req.body, req.user);
    res.status(201).json(debt);
});

const updateDebt = asyncHandler(async (req, res) => {
    const updated = await debtService.updateDebt(
        req.params.id,
        req.body,
        req.user.userId
    );

    res.status(200).json(updated);
});

const deleteDebt = asyncHandler(async (req, res) => {
    await debtService.deleteDebt(req.params.id, req.user.userId);
    res.status(200).json({ message: 'Deuda eliminada correctamente' });
});

const markAsPay = asyncHandler(async (req, res) => {
    const paidDebt = await debtService.markAsPaid(
        req.params.id,
        req.user.userId
    );

    res.status(200).json({
        message: 'Deuda marcada como pagada',
        debt: paidDebt
    });
});

const getDebtSummary = asyncHandler(async (req, res) => {
    const summary = await debtService.getDebtSummaryForUser(req.user.userId);

    res.status(200).json({
        msg: 'Resumen financiero obtenido con éxito.',
        summary
    });
});

const getDebtHistory = asyncHandler(async (req, res) => {
    const history = await debtService.getDebtHistoryForUser(req.user.userId);

    res.status(200).json({
        count: {
            total: history.active.length + history.paid.length,
            active: history.active.length,
            paid: history.paid.length
        },
        active: history.active,
        paid: history.paid
    });
});

const getDebtsInGroup = asyncHandler(async (req, res) => {
    const { groupCode } = req.params;
    const debts = await debtService.getDebtsForUserInGroupByCode(
        req.user.userId,
        groupCode
    );

    res.status(200).json({
        msg: `Deudas encontradas en el grupo ${groupCode}`,
        count: debts.length,
        debts
    });
});

module.exports = {
    getAllDebts,
    getDebtById,
    createDebt,
    updateDebt,
    deleteDebt,
    markAsPay,
    getDebtSummary,
    getDebtHistory,
    getDebtsInGroup
};
