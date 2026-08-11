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

const parseBoolean = (value, fallback) => {
    if (value === undefined || value === '') {
        return fallback;
    }

    return String(value).trim().toLowerCase() === 'true';
};

const parseNonNegativeInteger = (value, fallback) => {
    if (value === undefined || value === '') {
        return fallback;
    }

    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
        return fallback;
    }

    return parsedValue;
};

const parsePositiveInteger = (value, fallback) => {
    const parsedValue = parseNonNegativeInteger(value, fallback);
    return parsedValue > 0 ? parsedValue : fallback;
};

const parseOrigins = value => {
    if (!value) {
        return [];
    }

    return [...new Set(
        String(value)
            .split(',')
            .map(origin => origin.trim().replace(/\/$/, ''))
            .filter(Boolean)
    )];
};

const createHttpSecurityConfig = (env = process.env) => ({
    corsAllowLocalhost: parseBoolean(
        env.CORS_ALLOW_LOCALHOST,
        DEFAULTS.corsAllowLocalhost
    ),
    corsAllowedOrigins: parseOrigins(env.CORS_ALLOWED_ORIGINS),
    globalRateLimitMax: parsePositiveInteger(
        env.GLOBAL_RATE_LIMIT_MAX,
        DEFAULTS.globalRateLimitMax
    ),
    globalRateLimitWindowMs: parsePositiveInteger(
        env.GLOBAL_RATE_LIMIT_WINDOW_MS,
        DEFAULTS.globalRateLimitWindowMs
    ),
    jsonBodyLimit: env.JSON_BODY_LIMIT || DEFAULTS.jsonBodyLimit,
    loginRateLimitMax: parsePositiveInteger(
        env.LOGIN_RATE_LIMIT_MAX,
        DEFAULTS.loginRateLimitMax
    ),
    loginRateLimitWindowMs: parsePositiveInteger(
        env.LOGIN_RATE_LIMIT_WINDOW_MS,
        DEFAULTS.loginRateLimitWindowMs
    ),
    rateLimitEnabled: parseBoolean(
        env.RATE_LIMIT_ENABLED,
        DEFAULTS.rateLimitEnabled
    ),
    registrationRateLimitMax: parsePositiveInteger(
        env.REGISTRATION_RATE_LIMIT_MAX,
        DEFAULTS.registrationRateLimitMax
    ),
    registrationRateLimitWindowMs: parsePositiveInteger(
        env.REGISTRATION_RATE_LIMIT_WINDOW_MS,
        DEFAULTS.registrationRateLimitWindowMs
    ),
    trustProxyHops: parseNonNegativeInteger(
        env.TRUST_PROXY_HOPS,
        DEFAULTS.trustProxyHops
    )
});

module.exports = {
    createHttpSecurityConfig,
    DEFAULTS
};
