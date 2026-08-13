const { asyncHandler } = require('../../middlewares/asyncHandler');
const { createDebtDto, updateDebtDto } = require('../../dtos/debtDtos');
const {
    historyPaginationDto,
    listPaginationDto,
    summaryPaginationDto
} = require('../../dtos/paginationDtos');
const {
    setPaginationHeaders
} = require('../../helpers/paginationHeaders');

const createDebtController = ({ debtService }) => {
    const getAllDebts = asyncHandler(async (req, res) => {
        const result = await debtService.getAllDebts(
            req.user.userId,
            listPaginationDto(req.validated?.query)
        );
        setPaginationHeaders(res, result.count, result.pagination);
        res.status(200).json(result.debts);
    });

    const getDebtById = asyncHandler(async (req, res) => {
        const debt = await debtService.getDebtById(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json(debt);
    });

    const createDebt = asyncHandler(async (req, res) => {
        const debtData = createDebtDto(req.validated.body);
        const debt = await debtService.createDebt(debtData, req.user);
        res.status(201).json(debt);
    });

    const updateDebt = asyncHandler(async (req, res) => {
        const updated = await debtService.updateDebt(
            req.validated.params.id,
            updateDebtDto(req.validated.body),
            req.user.userId
        );

        res.status(200).json(updated);
    });

    const deleteDebt = asyncHandler(async (req, res) => {
        await debtService.deleteDebt(
            req.validated.params.id,
            req.user.userId
        );
        res.status(200).json({
            message: 'Deuda eliminada correctamente'
        });
    });

    const markAsPay = asyncHandler(async (req, res) => {
        const paidDebt = await debtService.markAsPaid(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json({
            message: 'Deuda marcada como pagada',
            debt: paidDebt
        });
    });

    const getDebtSummary = asyncHandler(async (req, res) => {
        const summary = await debtService.getDebtSummaryForUser(
            req.user.userId,
            summaryPaginationDto(req.validated?.query)
        );

        res.status(200).json({
            msg: 'Resumen financiero obtenido con éxito.',
            summary: {
                debts: summary.debts,
                credits: summary.credits
            },
            count: summary.count,
            pagination: summary.pagination
        });
    });

    const getDebtHistory = asyncHandler(async (req, res) => {
        const history = await debtService.getDebtHistoryForUser(
            req.user.userId,
            historyPaginationDto(req.validated?.query)
        );

        res.status(200).json(history);
    });

    const getDebtsInGroup = asyncHandler(async (req, res) => {
        const { groupCode } = req.validated.params;
        const result = await debtService.getDebtsForUserInGroupByCode(
            req.user.userId,
            groupCode,
            listPaginationDto(req.validated?.query)
        );

        res.status(200).json({
            msg: `Deudas encontradas en el grupo ${groupCode}`,
            count: result.count,
            pagination: result.pagination,
            debts: result.debts
        });
    });

    return {
        createDebt,
        deleteDebt,
        getAllDebts,
        getDebtById,
        getDebtHistory,
        getDebtSummary,
        getDebtsInGroup,
        markAsPay,
        updateDebt
    };
};

module.exports = { createDebtController };
