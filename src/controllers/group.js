const groupService = require('../services/groupService');
const { asyncHandler } = require('../middlewares/asyncHandler');

const getAllGroups = asyncHandler(async (req, res) => {
    const groups = await groupService.getAllGroups(req.user.userId);
    res.status(200).json(groups);
});

const getGroupById = asyncHandler(async (req, res) => {
    const group = await groupService.getGroupById(
        req.params.id,
        req.user.userId
    );

    res.status(200).json(group);
});

const getUserGroups = asyncHandler(async (req, res) => {
    const result = await groupService.getGroupsForUser(req.user.userId);
    res.status(200).json(result.data);
});

const createGroup = asyncHandler(async (req, res) => {
    const newGroup = await groupService.createGroup(req.body, req.user);
    res.status(201).json(newGroup);
});

const updateGroup = asyncHandler(async (req, res) => {
    const updatedGroup = await groupService.updateGroup(
        req.params.id,
        req.body,
        req.user.userId
    );

    res.status(200).json(updatedGroup);
});

const deleteGroup = asyncHandler(async (req, res) => {
    await groupService.deleteGroup(req.params.id, req.user.userId);
    res.status(200).json({ message: 'Grupo eliminado correctamente' });
});

const addMember = asyncHandler(async (req, res) => {
    const { groupCode, userNick } = req.body;
    const result = await groupService.addMemberToGroup(
        groupCode,
        userNick,
        req.user.userId
    );

    res.status(200).json(result);
});

module.exports = {
    addMember,
    getAllGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    getUserGroups
};
