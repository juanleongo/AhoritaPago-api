const { query } = require('express-validator');
const { PAGINATION } = require('../config/pagination');

const pageQuery = field => (
    query(field)
        .default(PAGINATION.defaultPage)
        .isInt({ min: 1 })
        .withMessage(`${field} debe ser un entero mayor o igual que 1.`)
        .toInt()
);

const limitQuery = () => (
    query('limit')
        .default(PAGINATION.defaultLimit)
        .isInt({ min: 1, max: PAGINATION.maxLimit })
        .withMessage(
            `limit debe ser un entero entre 1 y ${PAGINATION.maxLimit}.`
        )
        .toInt()
);

const historyPaginationValidators = [
    pageQuery('activePage'),
    pageQuery('paidPage'),
    limitQuery()
];

const searchPaginationValidators = [
    pageQuery('page'),
    limitQuery()
];

module.exports = {
    historyPaginationValidators,
    searchPaginationValidators
};
