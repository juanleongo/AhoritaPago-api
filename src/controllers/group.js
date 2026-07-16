const {response}= require('express')
const groupService = require('../services/groupService');

const getAllGroups = async (req, res= response) => {
    try {
        const groups = await groupService.getAllGroups(req.user.userId);
        res.status(200).json(groups);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const getGroupById = async (req, res) => {
    try {
        const group = await groupService.getGroupById(req.params.id, req.user.userId);
        if (!group) {
            return res.status(404).json({ message: 'Grupo no encontrado' });
        }
        res.status(200).json(group);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const getUserGroups = async (req = request, res = response) => {
    try {
        const result = await groupService.getGroupsForUser(req.user.userId);

        if (!result.success) {
            return res.status(500).json({ msg: result.error });
        }

        res.status(200).json(result.data);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const createGroup = async (req, res) => {
    try {
        const newGroup = await groupService.createGroup(req.body,req.user);
        res.status(201).json(newGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateGroup = async (req, res) => {
    try {
        const updatedGroup = await groupService.updateGroup(req.params.id, req.body, req.user.userId);
        if (!updatedGroup) {
            return res.status(404).json({ message: 'Grupo no encontrado' });
        }
        res.status(200).json(updatedGroup);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const deleted = await groupService.deleteGroup(req.params.id, req.user.userId);
        if (!deleted) {
            return res.status(404).json({ message: 'Grupo no encontrado' });
        }
        res.status(200).json({ message: 'Grupo eliminado correctamente' });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const addMember = async (req, res) => {
    try {
        const {groupCode, userNick } = req.body;
        const requesterId = req.user.userId;

        const result = await groupService.addMemberToGroup(groupCode, userNick, requesterId);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};
module.exports = { addMember, getAllGroups, getGroupById, createGroup, updateGroup, deleteGroup, getUserGroups };
