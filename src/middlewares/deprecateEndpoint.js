const createDeprecateEndpoint = ({ deprecationDate, successorPath }) => {
    const deprecationTimestamp = Math.floor(
        new Date(deprecationDate).getTime() / 1000
    );

    if (!Number.isFinite(deprecationTimestamp)) {
        throw new TypeError('deprecationDate debe ser una fecha válida');
    }

    if (!successorPath || !successorPath.startsWith('/')) {
        throw new TypeError('successorPath debe ser una ruta absoluta');
    }

    return function deprecatedEndpoint(req, res, next) {
        res.set('Deprecation', `@${deprecationTimestamp}`);
        res.set('Link', `<${successorPath}>; rel="successor-version"`);
        next();
    };
};

module.exports = { createDeprecateEndpoint };
