const {Group} = require('../models/group')

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
    const users = await Group.findAll()

    return users
}

const getGroupyId = async (id) => {
    const user = await Group.findById(id)

    return user

}

module.exports = {
    getAllGroup,
    getGroupyId,
    createGroup,
    updateGroup,
    deleteGroup

}