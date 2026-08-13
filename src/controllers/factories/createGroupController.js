const { asyncHandler } = require('../../middlewares/asyncHandler');
const {
    addGroupMemberDto,
    createGroupDto,
    updateGroupDto
} = require('../../dtos/groupDtos');
const { listPaginationDto } = require('../../dtos/paginationDtos');
const {
    setPaginationHeaders
} = require('../../helpers/paginationHeaders');

const createGroupController = ({ groupService }) => {
    const getGroupsForUser = asyncHandler(async (req, res) => {
        const result = await groupService.getGroupsForUser(
            req.user.userId,
            listPaginationDto(req.validated?.query)
        );
        setPaginationHeaders(res, result.count, result.pagination);
        res.status(200).json(result.groups);
    });

    const getGroupById = asyncHandler(async (req, res) => {
        const group = await groupService.getGroupById(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json(group);
    });

    const createGroup = asyncHandler(async (req, res) => {
        const groupData = createGroupDto(req.validated.body);
        const newGroup = await groupService.createGroup(groupData, req.user);
        res.status(201).json(newGroup);
    });

    const updateGroup = asyncHandler(async (req, res) => {
        const updatedGroup = await groupService.updateGroup(
            req.validated.params.id,
            updateGroupDto(req.validated.body),
            req.user.userId
        );

        res.status(200).json(updatedGroup);
    });

    const deleteGroup = asyncHandler(async (req, res) => {
        await groupService.deleteGroup(
            req.validated.params.id,
            req.user.userId
        );
        res.status(200).json({
            message: 'Grupo eliminado correctamente'
        });
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

        res.status(200).json({
            message: 'Usuario agregado al grupo exitosamente',
            group
        });
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

module.exports = { createGroupController };
