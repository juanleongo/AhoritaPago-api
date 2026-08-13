const { PAGINATION } = require('../config/pagination');

const historyPaginationDto = (query = {}) => ({
    activePage: query.activePage ?? PAGINATION.defaultPage,
    paidPage: query.paidPage ?? PAGINATION.defaultPage,
    limit: query.limit ?? PAGINATION.defaultLimit
});

const listPaginationDto = (query = {}) => ({
    page: query.page ?? PAGINATION.defaultPage,
    limit: query.limit ?? PAGINATION.defaultLimit
});

const summaryPaginationDto = (query = {}) => ({
    debtsPage: query.debtsPage ?? PAGINATION.defaultPage,
    creditsPage: query.creditsPage ?? PAGINATION.defaultPage,
    limit: query.limit ?? PAGINATION.defaultLimit
});

const searchPaginationDto = (query = {}) => ({
    page: query.page ?? PAGINATION.defaultPage,
    limit: query.limit ?? PAGINATION.defaultLimit
});

module.exports = {
    historyPaginationDto,
    listPaginationDto,
    summaryPaginationDto,
    searchPaginationDto
};
