const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { createHttpSecurityConfig } = require('../config/httpSecurity');

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const isLocalOrigin = origin => {
    try {
        const parsedOrigin = new URL(origin);

        return (
            ['http:', 'https:'].includes(parsedOrigin.protocol)
            && LOCAL_HOSTNAMES.has(parsedOrigin.hostname)
        );
    } catch (error) {
        return false;
    }
};

const isOriginAllowed = (origin, config) => {
    if (!origin || config.corsAllowedOrigins.includes('*')) {
        return true;
    }

    const normalizedOrigin = origin.replace(/\/$/, '');

    return (
        config.corsAllowedOrigins.includes(normalizedOrigin)
        || (config.corsAllowLocalhost && isLocalOrigin(normalizedOrigin))
    );
};

const createRateLimitHandler = (code, message) => (req, res) => (
    res.status(429).json({
        success: false,
        error: { code, message }
    })
);

const createLimiter = ({ code, max, message, windowMs, ...options }) => (
    rateLimit({
        legacyHeaders: false,
        limit: max,
        message,
        skip: req => req.method === 'OPTIONS',
        standardHeaders: 'draft-8',
        windowMs,
        handler: createRateLimitHandler(code, message),
        ...options
    })
);

const createHttpSecurity = config => {
    const corsMiddleware = cors({
        allowedHeaders: ['Authorization', 'Content-Type'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        origin(origin, callback) {
            callback(null, isOriginAllowed(origin, config));
        }
    });

    const security = {
        cors: corsMiddleware,
        globalRateLimiter: null,
        helmet: helmet(),
        loginRateLimiter: null,
        registrationRateLimiter: null
    };

    if (!config.rateLimitEnabled) {
        return security;
    }

    security.globalRateLimiter = createLimiter({
        code: 'GLOBAL_RATE_LIMIT_EXCEEDED',
        max: config.globalRateLimitMax,
        message: 'Se alcanzó el límite de solicitudes. Intenta nuevamente más tarde.',
        windowMs: config.globalRateLimitWindowMs
    });
    security.loginRateLimiter = createLimiter({
        code: 'LOGIN_RATE_LIMIT_EXCEEDED',
        max: config.loginRateLimitMax,
        message: 'Se alcanzó el límite de intentos de inicio de sesión. Intenta nuevamente más tarde.',
        skipSuccessfulRequests: true,
        windowMs: config.loginRateLimitWindowMs
    });
    security.registrationRateLimiter = createLimiter({
        code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
        max: config.registrationRateLimitMax,
        message: 'Se alcanzó el límite de registros. Intenta nuevamente más tarde.',
        windowMs: config.registrationRateLimitWindowMs
    });

    return security;
};

const defaultConfig = createHttpSecurityConfig();
const defaultHttpSecurity = createHttpSecurity(defaultConfig);

module.exports = {
    createHttpSecurity,
    defaultHttpSecurity,
    isOriginAllowed
};
