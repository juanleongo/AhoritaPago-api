const applyTransaction = (query, options = {}) => {
    if (options.transaction) {
        return query.session(options.transaction);
    }

    return query;
};

const buildWriteOptions = (options = {}, defaults = {}) => {
    if (!options.transaction) {
        return defaults;
    }

    return { ...defaults, session: options.transaction };
};

module.exports = {
    applyTransaction,
    buildWriteOptions
};
