const { asyncHandler } = require('../../middlewares/asyncHandler');
const { createDebtDto, updateDebtDto } = require('../../dtos/debtDtos');
const { historyPaginationDto } = require('../../dtos/paginationDtos');
const {
    createSuccessResponse
} = require('../../dtos/output/responseDto');
const {
    debtResponseDto,
    debtSummaryDto
} = require('../../dtos/output/debtResponseDtos');

const createDebtControllerV2 = ({ debtService }) => {
    const getAllDebts = asyncHandler(async (req, res) => {
        const debts = await debtService.getAllDebts(req.user.userId);

        res.status(200).json(createSuccessResponse({
            data: debts.map(debtResponseDto),
            meta: { count: debts.length }
        }));
    });

    const getDebtById = asyncHandler(async (req, res) => {
        const debt = await debtService.getDebtById(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: debtResponseDto(debt)
        }));
    });

    const createDebt = asyncHandler(async (req, res) => {
        const debts = await debtService.createDebt(
            createDebtDto(req.validated.body),
            req.user
        );

        res.status(201).json(createSuccessResponse({
            data: debts.map(debtResponseDto),
            meta: { count: debts.length },
            message: 'Deuda creada correctamente'
        }));
    });

    const updateDebt = asyncHandler(async (req, res) => {
        const debt = await debtService.updateDebt(
            req.validated.params.id,
            updateDebtDto(req.validated.body),
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: debtResponseDto(debt),
            message: 'Deuda actualizada correctamente'
        }));
    });

    const deleteDebt = asyncHandler(async (req, res) => {
        await debtService.deleteDebt(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: null,
            message: 'Deuda eliminada correctamente'
        }));
    });

    const markAsPay = asyncHandler(async (req, res) => {
        const debt = await debtService.markAsPaid(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: debtResponseDto(debt),
            message: 'Deuda marcada como pagada'
        }));
    });

    const getDebtSummary = asyncHandler(async (req, res) => {
        const summary = await debtService.getDebtSummaryForUser(
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: debtSummaryDto(summary)
        }));
    });

    const getDebtHistory = asyncHandler(async (req, res) => {
        const history = await debtService.getDebtHistoryForUser(
            req.user.userId,
            historyPaginationDto(req.validated?.query)
        );

        res.status(200).json(createSuccessResponse({
            data: {
                active: history.active.map(debtResponseDto),
                paid: history.paid.map(debtResponseDto)
            },
            meta: {
                count: history.count,
                pagination: history.pagination
            }
        }));
    });

    const getDebtsInGroup = asyncHandler(async (req, res) => {
        const debts = await debtService.getDebtsForUserInGroupByCode(
            req.user.userId,
            req.validated.params.groupCode
        );

        res.status(200).json(createSuccessResponse({
            data: debts.map(debtResponseDto),
            meta: { count: debts.length }
        }));
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

module.exports = { createDebtControllerV2 };
