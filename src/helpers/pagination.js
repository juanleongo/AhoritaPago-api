const createPaginationMetadata = (totalItems, page, limit) => {
    const totalPages = Math.ceil(totalItems / limit);

    return {
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
};

const getPaginationOffset = (page, limit) => (page - 1) * limit;

module.exports = {
    createPaginationMetadata,
    getPaginationOffset
};
