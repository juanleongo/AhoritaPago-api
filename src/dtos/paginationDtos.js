const { PAGINATION } = require('../config/pagination');

const historyPaginationDto = (query = {}) => ({
    activePage: query.activePage ?? PAGINATION.defaultPage,
    paidPage: query.paidPage ?? PAGINATION.defaultPage,
    limit: query.limit ?? PAGINATION.defaultLimit
});

const searchPaginationDto = (query = {}) => ({
    page: query.page ?? PAGINATION.defaultPage,
    limit: query.limit ?? PAGINATION.defaultLimit
});

module.exports = {
    historyPaginationDto,
    searchPaginationDto
};
