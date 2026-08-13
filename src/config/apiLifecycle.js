const { ConfigurationError } = require('./configurationError');

const DEFAULTS = Object.freeze({
    legacyApiDeprecationDate: '2026-08-13T00:00:00.000Z',
    legacyApiEnabled: true,
    legacyApiLogUsage: true,
    legacyApiSunsetDate: '2027-02-01T00:00:00.000Z'
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

const parseDate = (variable, value, fallback, errors) => {
    const candidate = isMissing(value) ? fallback : String(value).trim();
    const timestamp = Date.parse(candidate);

    if (!Number.isFinite(timestamp)) {
        errors.push({
            variable,
            message: 'debe ser una fecha ISO 8601 válida.'
        });
        return fallback;
    }

    return new Date(timestamp).toISOString();
};

const createApiLifecycleConfig = (env = {}) => {
    const errors = [];
    const legacyApiDeprecationDate = parseDate(
        'LEGACY_API_DEPRECATION_DATE',
        env.LEGACY_API_DEPRECATION_DATE,
        DEFAULTS.legacyApiDeprecationDate,
        errors
    );
    const legacyApiSunsetDate = parseDate(
        'LEGACY_API_SUNSET_DATE',
        env.LEGACY_API_SUNSET_DATE,
        DEFAULTS.legacyApiSunsetDate,
        errors
    );

    if (
        Date.parse(legacyApiSunsetDate)
        <= Date.parse(legacyApiDeprecationDate)
    ) {
        errors.push({
            variable: 'LEGACY_API_SUNSET_DATE',
            message: 'debe ser posterior a LEGACY_API_DEPRECATION_DATE.'
        });
    }

    const config = {
        legacyApiDeprecationDate,
        legacyApiEnabled: parseBoolean(
            'LEGACY_API_ENABLED',
            env.LEGACY_API_ENABLED,
            DEFAULTS.legacyApiEnabled,
            errors
        ),
        legacyApiLogUsage: parseBoolean(
            'LEGACY_API_LOG_USAGE',
            env.LEGACY_API_LOG_USAGE,
            DEFAULTS.legacyApiLogUsage,
            errors
        ),
        legacyApiSunsetDate
    };

    if (errors.length > 0) {
        throw new ConfigurationError(errors);
    }

    return config;
};

module.exports = {
    createApiLifecycleConfig,
    DEFAULTS
};
