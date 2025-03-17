const Group = require('../models/group')

const createGroup = async (groupData) => {
    const newGroup = await Group.create(groupData)
    return newGroup
}

const deleteGroup = async (id) => {
    const  delGroup = await Group.findByIdAndUpdate(id,{state : false})
    return delGroup
}

const updateGroup = async (id,groupData) => {
    const updateGroup = await Group.findAndUpdate(id,groupData)
    return updateGroup
}

const getAllGroup = async () => {
    const groups = await Group.findAll()

    return groups
}

const getGroupyId = async (id) => {
    const group = await Group.findById(id)

    return group

}

const getGroupByName = async (name) => {
    const group = await Group.findOne({name});
    return group;

}

module.exports = {
    getAllGroup,
    getGroupyId,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupByName

}