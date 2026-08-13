const { ConfigurationError } = require('./configurationError');
const { createHttpSecurityConfig } = require('./httpSecurity');
const { createApiLifecycleConfig } = require('./apiLifecycle');

const JWT_SECRET_PLACEHOLDER = (
    'reemplazar-con-un-secreto-largo-y-aleatorio'
);

const deepFreeze = value => {
    Object.values(value).forEach(nestedValue => {
        if (
            nestedValue
            && typeof nestedValue === 'object'
            && !Object.isFrozen(nestedValue)
        ) {
            deepFreeze(nestedValue);
        }
    });

    return Object.freeze(value);
};

const parsePort = (value, errors) => {
    const normalizedValue = value === undefined ? '' : String(value).trim();

    if (!/^\d+$/.test(normalizedValue)) {
        errors.push({
            variable: 'PORT',
            message: 'debe ser un entero entre 1 y 65535.'
        });
        return null;
    }

    const port = Number(normalizedValue);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        errors.push({
            variable: 'PORT',
            message: 'debe ser un entero entre 1 y 65535.'
        });
        return null;
    }

    return port;
};

const parseDatabaseUrl = (value, errors) => {
    const databaseUrl = value === undefined ? '' : String(value).trim();
    const uriMatch = databaseUrl.match(
        /^mongodb(?:\+srv)?:\/\/([^/?#\s]+)(?:[/?#][^\s]*)?$/i
    );
    const authority = uriMatch?.[1] || '';
    const hosts = authority.slice(authority.lastIndexOf('@') + 1);
    const hasHosts = (
        Boolean(hosts)
        && hosts.split(',').every(host => host && !host.startsWith(':'))
    );

    if (!uriMatch || !hasHosts) {
        errors.push({
            variable: 'DATABASE_URL',
            message: 'debe ser una URI mongodb:// o mongodb+srv:// válida.'
        });
        return null;
    }

    return databaseUrl;
};

const parseJwtSecret = (value, errors) => {
    const jwtSecret = value === undefined ? '' : String(value);
    const isInvalid = (
        jwtSecret.length < 32
        || jwtSecret.trim() !== jwtSecret
        || jwtSecret === JWT_SECRET_PLACEHOLDER
    );

    if (isInvalid) {
        errors.push({
            variable: 'JWT_SECRET',
            message: (
                'debe tener al menos 32 caracteres, sin espacios externos '
                + 'y no puede usar el valor de ejemplo.'
            )
        });
        return null;
    }

    return jwtSecret;
};

const createAppConfig = (env = process.env) => {
    const errors = [];
    const port = parsePort(env.PORT, errors);
    const databaseUrl = parseDatabaseUrl(env.DATABASE_URL, errors);
    const jwtSecret = parseJwtSecret(env.JWT_SECRET, errors);
    let httpSecurity;
    let apiLifecycle;

    try {
        apiLifecycle = createApiLifecycleConfig(env);
    } catch (error) {
        if (error instanceof ConfigurationError) {
            errors.push(...error.details);
        } else {
            throw error;
        }
    }

    try {
        httpSecurity = createHttpSecurityConfig(env);
    } catch (error) {
        if (error instanceof ConfigurationError) {
            errors.push(...error.details);
        } else {
            throw error;
        }
    }

    if (errors.length > 0) {
        throw new ConfigurationError(errors);
    }

    return deepFreeze({
        apiLifecycle,
        auth: { jwtSecret },
        database: { url: databaseUrl },
        httpSecurity,
        server: { port }
    });
};

const getJwtSecretFromEnvironment = () => (
    createAppConfig(process.env).auth.jwtSecret
);

module.exports = {
    createAppConfig,
    getJwtSecretFromEnvironment,
    JWT_SECRET_PLACEHOLDER
};
