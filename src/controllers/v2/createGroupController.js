const { asyncHandler } = require('../../middlewares/asyncHandler');
const {
    addGroupMemberDto,
    createGroupDto,
    updateGroupDto
} = require('../../dtos/groupDtos');
const {
    createSuccessResponse
} = require('../../dtos/output/responseDto');
const {
    groupResponseDto
} = require('../../dtos/output/groupResponseDtos');

const createGroupControllerV2 = ({ groupService }) => {
    const getGroupsForUser = asyncHandler(async (req, res) => {
        const groups = await groupService.getGroupsForUser(req.user.userId);

        res.status(200).json(createSuccessResponse({
            data: groups.map(groupResponseDto),
            meta: { count: groups.length }
        }));
    });

    const getGroupById = asyncHandler(async (req, res) => {
        const group = await groupService.getGroupById(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: groupResponseDto(group)
        }));
    });

    const createGroup = asyncHandler(async (req, res) => {
        const group = await groupService.createGroup(
            createGroupDto(req.validated.body),
            req.user
        );

        res.status(201).json(createSuccessResponse({
            data: groupResponseDto(group),
            message: 'Grupo creado correctamente'
        }));
    });

    const updateGroup = asyncHandler(async (req, res) => {
        const group = await groupService.updateGroup(
            req.validated.params.id,
            updateGroupDto(req.validated.body),
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: groupResponseDto(group),
            message: 'Grupo actualizado correctamente'
        }));
    });

    const deleteGroup = asyncHandler(async (req, res) => {
        await groupService.deleteGroup(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: null,
            message: 'Grupo eliminado correctamente'
        }));
    });

    const addMember = asyncHandler(async (req, res) => {
        const { groupCode, userNick } = addGroupMemberDto(
            req.validated.body
        );
        const group = await groupService.addMemberToGroup(
            groupCode,
            userNick,
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: groupResponseDto(group),
            message: 'Usuario agregado al grupo exitosamente'
        }));
    });

    return {
        addMember,
        createGroup,
        deleteGroup,
        getGroupById,
        getGroupsForUser,
        updateGroup
    };
};

module.exports = { createGroupControllerV2 };
