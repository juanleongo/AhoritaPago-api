const groupRepository = require('../repositories/group');
const userRepository = require('../repositories/user');
const { generateRandomCode } = require('../helpers/codeGenerator');
const { createGroupService } = require('./factories/createGroupService');

module.exports = createGroupService({
    generateRandomCode,
    groupRepository,
    userRepository
});
