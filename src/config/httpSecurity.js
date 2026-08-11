const { ConfigurationError } = require('./configurationError');

const DEFAULTS = Object.freeze({
    corsAllowLocalhost: true,
    corsAllowedOrigins: [],
    globalRateLimitMax: 500,
    globalRateLimitWindowMs: 15 * 60 * 1000,
    jsonBodyLimit: '100kb',
    loginRateLimitMax: 15,
    loginRateLimitWindowMs: 15 * 60 * 1000,
    rateLimitEnabled: false,
    registrationRateLimitMax: 10,
    registrationRateLimitWindowMs: 60 * 60 * 1000,
    trustProxyHops: 0
});

const isMissing = value => value === undefined || value === '';

const parseBoolean = (variable, value, fallback, errors) => {
    if (isMissing(value)) {
        return fallback;
    }

    const normalizedValue = String(value).trim().toLowerCase();

    if (!['true', 'false'].includes(normalizedValue)) {
        errors.push({
            variable,
            message: 'debe ser true o false.'
        });
        return fallback;
    }

    return normalizedValue === 'true';
};

const parseInteger = ({
    variable,
    value,
    fallback,
    minimum,
    errors
}) => {
    if (isMissing(value)) {
        return fallback;
    }

    const normalizedValue = String(value).trim();

    if (!/^\d+$/.test(normalizedValue)) {
        errors.push({
            variable,
            message: `debe ser un entero mayor o igual que ${minimum}.`
        });
        return fallback;
    }

    const parsedValue = Number(normalizedValue);

    if (!Number.isSafeInteger(parsedValue) || parsedValue < minimum) {
        errors.push({
            variable,
            message: `debe ser un entero mayor o igual que ${minimum}.`
        });
        return fallback;
    }

    return parsedValue;
};

const normalizeOrigin = (origin, errors) => {
    if (origin === '*') {
        return origin;
    }

    try {
        const parsedOrigin = new URL(origin);
        const hasOnlyOrigin = (
            parsedOrigin.pathname === '/'
            && !parsedOrigin.search
            && !parsedOrigin.hash
            && !parsedOrigin.username
            && !parsedOrigin.password
        );

        if (
            !['http:', 'https:'].includes(parsedOrigin.protocol)
            || !hasOnlyOrigin
        ) {
            throw new Error('Invalid origin');
        }

        return parsedOrigin.origin;
    } catch (error) {
        errors.push({
            variable: 'CORS_ALLOWED_ORIGINS',
            message: 'debe contener únicamente orígenes HTTP/HTTPS válidos.'
        });
        return null;
    }
};

const parseOrigins = (value, errors) => {
    if (isMissing(value)) {
        return [];
    }

    const origins = String(value)
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
        .map(origin => normalizeOrigin(origin, errors))
        .filter(Boolean);

    if (origins.includes('*') && origins.length > 1) {
        errors.push({
            variable: 'CORS_ALLOWED_ORIGINS',
            message: 'no puede combinar * con orígenes específicos.'
        });
    }

    return [...new Set(origins)];
};

const parseBodyLimit = (value, errors) => {
    if (isMissing(value)) {
        return DEFAULTS.jsonBodyLimit;
    }

    const normalizedValue = String(value).trim().toLowerCase();

    if (!/^[1-9]\d*(b|kb|mb)$/.test(normalizedValue)) {
        errors.push({
            variable: 'JSON_BODY_LIMIT',
            message: 'debe ser un tamaño positivo expresado en b, kb o mb.'
        });
        return DEFAULTS.jsonBodyLimit;
    }

    return normalizedValue;
};

const createHttpSecurityConfig = (env = {}) => {
    const errors = [];
    const config = {
        corsAllowLocalhost: parseBoolean(
            'CORS_ALLOW_LOCALHOST',
            env.CORS_ALLOW_LOCALHOST,
            DEFAULTS.corsAllowLocalhost,
            errors
        ),
        corsAllowedOrigins: parseOrigins(
            env.CORS_ALLOWED_ORIGINS,
            errors
        ),
        globalRateLimitMax: parseInteger({
            variable: 'GLOBAL_RATE_LIMIT_MAX',
            value: env.GLOBAL_RATE_LIMIT_MAX,
            fallback: DEFAULTS.globalRateLimitMax,
            minimum: 1,
            errors
        }),
        globalRateLimitWindowMs: parseInteger({
            variable: 'GLOBAL_RATE_LIMIT_WINDOW_MS',
            value: env.GLOBAL_RATE_LIMIT_WINDOW_MS,
            fallback: DEFAULTS.globalRateLimitWindowMs,
            minimum: 1,
            errors
        }),
        jsonBodyLimit: parseBodyLimit(env.JSON_BODY_LIMIT, errors),
        loginRateLimitMax: parseInteger({
            variable: 'LOGIN_RATE_LIMIT_MAX',
            value: env.LOGIN_RATE_LIMIT_MAX,
            fallback: DEFAULTS.loginRateLimitMax,
            minimum: 1,
            errors
        }),
        loginRateLimitWindowMs: parseInteger({
            variable: 'LOGIN_RATE_LIMIT_WINDOW_MS',
            value: env.LOGIN_RATE_LIMIT_WINDOW_MS,
            fallback: DEFAULTS.loginRateLimitWindowMs,
            minimum: 1,
            errors
        }),
        rateLimitEnabled: parseBoolean(
            'RATE_LIMIT_ENABLED',
            env.RATE_LIMIT_ENABLED,
            DEFAULTS.rateLimitEnabled,
            errors
        ),
        registrationRateLimitMax: parseInteger({
            variable: 'REGISTRATION_RATE_LIMIT_MAX',
            value: env.REGISTRATION_RATE_LIMIT_MAX,
            fallback: DEFAULTS.registrationRateLimitMax,
            minimum: 1,
            errors
        }),
        registrationRateLimitWindowMs: parseInteger({
            variable: 'REGISTRATION_RATE_LIMIT_WINDOW_MS',
            value: env.REGISTRATION_RATE_LIMIT_WINDOW_MS,
            fallback: DEFAULTS.registrationRateLimitWindowMs,
            minimum: 1,
            errors
        }),
        trustProxyHops: parseInteger({
            variable: 'TRUST_PROXY_HOPS',
            value: env.TRUST_PROXY_HOPS,
            fallback: DEFAULTS.trustProxyHops,
            minimum: 0,
            errors
        })
    };

    if (errors.length > 0) {
        throw new ConfigurationError(errors);
    }

    return config;
};

module.exports = {
    createHttpSecurityConfig,
    DEFAULTS
};
