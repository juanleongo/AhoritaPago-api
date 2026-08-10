const { pickFields } = require('./pickFields');

const loginDto = data => pickFields(data, ['email', 'password']);

module.exports = { loginDto };
