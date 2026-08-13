const toUnixTimestamp = (value, field) => {
    const timestamp = Math.floor(new Date(value).getTime() / 1000);

    if (!Number.isFinite(timestamp)) {
        throw new TypeError(`${field} debe ser una fecha válida`);
    }

    return timestamp;
};

const assertAbsolutePath = (value, field) => {
    if (!value || !value.startsWith('/')) {
        throw new TypeError(`${field} debe ser una ruta absoluta`);
    }
};

const getRequestHeader = (req, name) => {
    const value = typeof req.get === 'function'
        ? req.get(name)
        : req.headers?.[name.toLowerCase()];

    return value ? String(value).slice(0, 300) : null;
};

const getLegacyPath = req => {
    const relativePath = req.path === '/' ? '' : req.path;
    return `${req.baseUrl || ''}${relativePath}` || '/';
};

const getQuerySuffix = req => {
    const queryIndex = req.originalUrl?.indexOf('?') ?? -1;
    return queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
};

const createLegacySuccessorResolver = ({
    pathRewrites = {},
    successorBasePath
}) => {
    assertAbsolutePath(successorBasePath, 'successorBasePath');

    return req => {
        const currentPath = req.path || '/';
        const rewrite = pathRewrites[currentPath];
        const rewrittenPath = typeof rewrite === 'function'
            ? rewrite(req)
            : rewrite;
        const relativePath = rewrittenPath ?? (
            currentPath === '/' ? '' : currentPath
        );

        return `${successorBasePath}${relativePath}${getQuerySuffix(req)}`;
    };
};

const createDeprecateEndpoint = ({
    deprecationDate,
    logger = console,
    logUsage = false,
    resolveSuccessorPath,
    successorPath,
    sunsetDate
}) => {
    const deprecationTimestamp = toUnixTimestamp(
        deprecationDate,
        'deprecationDate'
    );
    const sunsetTimestamp = sunsetDate === undefined
        ? null
        : toUnixTimestamp(sunsetDate, 'sunsetDate');

    if (sunsetTimestamp !== null && sunsetTimestamp <= deprecationTimestamp) {
        throw new TypeError('sunsetDate debe ser posterior a deprecationDate');
    }
    if (typeof resolveSuccessorPath !== 'function') {
        assertAbsolutePath(successorPath, 'successorPath');
    }
    if (logUsage && typeof logger?.info !== 'function') {
        throw new TypeError('logger.info debe ser una función');
    }

    return function deprecatedEndpoint(req, res, next) {
        const successor = resolveSuccessorPath
            ? resolveSuccessorPath(req)
            : successorPath;

        assertAbsolutePath(successor, 'successorPath');
        res.set('Deprecation', `@${deprecationTimestamp}`);
        res.set('Link', `<${successor}>; rel="successor-version"`);

        if (sunsetTimestamp !== null) {
            res.set('Sunset', new Date(sunsetDate).toUTCString());
        }

        if (logUsage) {
            res.once('finish', () => {
                logger.info(JSON.stringify({
                    event: 'legacy_api_request',
                    timestamp: new Date().toISOString(),
                    method: req.method,
                    path: getLegacyPath(req),
                    successor,
                    statusCode: res.statusCode,
                    origin: getRequestHeader(req, 'origin'),
                    userAgent: getRequestHeader(req, 'user-agent')
                }));
            });
        }

        next();
    };
};

module.exports = {
    createDeprecateEndpoint,
    createLegacySuccessorResolver,
    getLegacyPath
};
