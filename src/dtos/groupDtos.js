const { pickFields } = require('./pickFields');

const createGroupDto = data => pickFields(data, ['name']);
const updateGroupDto = data => pickFields(data, ['name']);
const addGroupMemberDto = data => pickFields(data, [
    'groupCode',
    'userNick'
]);

module.exports = {
    addGroupMemberDto,
    createGroupDto,
    updateGroupDto
};
