const { pickFields } = require('./pickFields');

const createDebtDto = data => pickFields(data, [
    'description',
    'value',
    'group',
    'debtor'
]);

const updateDebtDto = data => pickFields(data, ['description']);

module.exports = {
    createDebtDto,
    updateDebtDto
};
