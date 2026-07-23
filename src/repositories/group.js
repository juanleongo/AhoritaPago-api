const Group = require('../models/group')

const createGroup = async (groupData) => {
    const newGroup = await Group.create(groupData)
    return newGroup
}

const deleteGroup = async (id) => {
    const  delGroup = await Group.findByIdAndUpdate(id,{state : false}, { new: true })
    return delGroup
}

const updateGroup = async (id,groupData) => {
    const updateGroup = await Group.findByIdAndUpdate(id, groupData, { new: true, runValidators: true })
    return updateGroup
}

const getAllGroup = async () => {
    const groups = await Group.find({ state: true })
    return groups
}

const getGroupyId = async (id, session = null) => {
    const group = await Group.findById(id).session(session)
    return group

}
const getAllGroupsByUser= async (id) => {
    const groups = await Group.find({ members: id, state: true })
    return groups
}
   


const getGroupByName = async (name) => {
    const group = await Group.findOne({name});
    return group;

}

const getGroupByCode = async (code) => {
    const group = await Group.findOne({code});
    return group;

}
module.exports = {
    getAllGroup,
    getGroupyId,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupByName,
    getGroupByCode,
    getAllGroupsByUser

}
