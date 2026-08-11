const applySession = (query, options = {}) => {
    if (options.session) {
        return query.session(options.session);
    }

    return query;
};

const buildWriteOptions = (options = {}, defaults = {}) => {
    if (!options.session) {
        return defaults;
    }

    return { ...defaults, session: options.session };
};

module.exports = {
    applySession,
    buildWriteOptions
};
