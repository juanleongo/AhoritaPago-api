const {response}= require('express')
const groupService = require('../services/groupService');

const getAllGroups = async (req, res) => {
    try {
        const groups = await groupService.getAllGroups();
        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGroupById = async (req, res) => {
    try {
        const group = await groupService.getGroupById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Grupo no encontrado' });
        }
        res.status(200).json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createGroup = async (req, res) => {
    try {
        const newGroup = await groupService.createGroup(req.body);
        res.status(201).json(newGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateGroup = async (req, res) => {
    try {
        const updatedGroup = await groupService.updateGroup(req.params.id, req.body);
        if (!updatedGroup) {
            return res.status(404).json({ message: 'Grupo no encontrado' });
        }
        res.status(200).json(updatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const deleted = await groupService.deleteGroup(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Grupo no encontrado' });
        }
        res.status(200).json({ message: 'Grupo eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllGroups, getGroupById, createGroup, updateGroup, deleteGroup };
