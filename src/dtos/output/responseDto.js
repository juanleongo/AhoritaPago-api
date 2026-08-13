const createSuccessResponse = ({
    data = null,
    message,
    meta
} = {}) => {
    const response = {
        success: true,
        data
    };

    if (meta !== undefined) {
        response.meta = meta;
    }
    if (message !== undefined) {
        response.message = message;
    }

    return response;
};

module.exports = { createSuccessResponse };
