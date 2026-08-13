const { pickFields } = require('./pickFields');

const createUserDto = data => pickFields(data, [
    'name',
    'nickname',
    'email',
    'password'
]);

const updateUserDto = data => pickFields(data, [
    'name',
    'nickname',
    'email'
]);

const nicknameLookupDto = data => pickFields(data, ['nick']);
const nicknameParamDto = data => pickFields(data, ['nickname']);

module.exports = {
    createUserDto,
    nicknameLookupDto,
    nicknameParamDto,
    updateUserDto
};
