const setPaginationHeaders = (response, count, pagination) => {
    response.set({
        'X-Limit': String(pagination.limit),
        'X-Page': String(pagination.page),
        'X-Total-Count': String(count),
        'X-Total-Pages': String(pagination.totalPages)
    });
};

module.exports = { setPaginationHeaders };
