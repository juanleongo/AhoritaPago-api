const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createAppConfig,
    JWT_SECRET_PLACEHOLDER
} = require('../../src/config/appConfig');
const { ConfigurationError } = require(
    '../../src/config/configurationError'
);
const { VALID_ENV } = require('../fixtures/appConfig');

describe('configuración central de la aplicación', () => {
    it('normaliza y congela una configuración válida', () => {
        const config = createAppConfig({
            ...VALID_ENV,
            CORS_ALLOW_LOCALHOST: 'false',
            CORS_ALLOWED_ORIGINS: (
                'https://app.example.com/,http://localhost:5173'
            ),
            JSON_BODY_LIMIT: '2MB',
            RATE_LIMIT_ENABLED: 'true',
            TRUST_PROXY_HOPS: '2'
        });

        assert.equal(config.server.port, 3001);
        assert.equal(config.database.url, VALID_ENV.DATABASE_URL);
        assert.equal(config.auth.jwtSecret, VALID_ENV.JWT_SECRET);
        assert.equal(config.apiLifecycle.legacyApiEnabled, true);
        assert.equal(config.apiLifecycle.legacyApiLogUsage, false);
        assert.equal(
            config.apiLifecycle.legacyApiDeprecationDate,
            '2026-08-13T00:00:00.000Z'
        );
        assert.equal(
            config.apiLifecycle.legacyApiSunsetDate,
            '2027-02-01T00:00:00.000Z'
        );
        assert.equal(config.httpSecurity.corsAllowLocalhost, false);
        assert.deepEqual(config.httpSecurity.corsAllowedOrigins, [
            'https://app.example.com',
            'http://localhost:5173'
        ]);
        assert.equal(config.httpSecurity.jsonBodyLimit, '2mb');
        assert.equal(config.httpSecurity.rateLimitEnabled, true);
        assert.equal(config.httpSecurity.trustProxyHops, 2);
        assert.equal(Object.isFrozen(config), true);
        assert.equal(Object.isFrozen(config.auth), true);
        assert.equal(Object.isFrozen(config.apiLifecycle), true);
        assert.equal(Object.isFrozen(config.httpSecurity), true);
        assert.equal(
            Object.isFrozen(config.httpSecurity.corsAllowedOrigins),
            true
        );
    });

    it('informa juntas las variables obligatorias ausentes', () => {
        assert.throws(
            () => createAppConfig({}),
            error => {
                assert.ok(error instanceof ConfigurationError);
                assert.equal(error.code, 'INVALID_CONFIGURATION');
                assert.deepEqual(
                    error.details.map(detail => detail.variable),
                    ['PORT', 'DATABASE_URL', 'JWT_SECRET']
                );
                return true;
            }
        );
    });

    it('rechaza puertos, URI y secretos inválidos sin exponer valores', () => {
        const shortSecret = 'secret-do-not-expose';

        assert.throws(
            () => createAppConfig({
                PORT: '70000',
                DATABASE_URL: 'https://database.example.com',
                JWT_SECRET: shortSecret
            }),
            error => {
                assert.deepEqual(
                    error.details.map(detail => detail.variable),
                    ['PORT', 'DATABASE_URL', 'JWT_SECRET']
                );
                assert.equal(error.message.includes(shortSecret), false);
                assert.equal(
                    error.details.some(
                        detail => Object.hasOwn(detail, 'value')
                    ),
                    false
                );
                return true;
            }
        );
    });

    it('requiere al menos un host en la URI de MongoDB', () => {
        assert.throws(
            () => createAppConfig({
                ...VALID_ENV,
                DATABASE_URL: 'mongodb://?retryWrites=true'
            }),
            error => (
                error.details.some(
                    detail => detail.variable === 'DATABASE_URL'
                )
            )
        );
    });

    it('rechaza explícitamente el secreto de ejemplo', () => {
        assert.throws(
            () => createAppConfig({
                ...VALID_ENV,
                JWT_SECRET: JWT_SECRET_PLACEHOLDER
            }),
            error => (
                error.details.some(
                    detail => detail.variable === 'JWT_SECRET'
                )
            )
        );
    });
});
