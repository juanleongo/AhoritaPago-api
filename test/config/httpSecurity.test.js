const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createHttpSecurityConfig,
    DEFAULTS
} = require('../../src/config/httpSecurity');

describe('configuración de seguridad HTTP', () => {
    it('mantiene el rate limiting y trust proxy inactivos por defecto', () => {
        const config = createHttpSecurityConfig({});

        assert.equal(config.rateLimitEnabled, false);
        assert.equal(config.trustProxyHops, 0);
        assert.equal(config.corsAllowLocalhost, true);
        assert.equal(config.jsonBodyLimit, '100kb');
    });

    it('lee orígenes y límites desde variables de entorno', () => {
        const config = createHttpSecurityConfig({
            CORS_ALLOW_LOCALHOST: 'false',
            CORS_ALLOWED_ORIGINS: (
                'https://app.example.com/, https://admin.example.com'
            ),
            GLOBAL_RATE_LIMIT_MAX: '250',
            JSON_BODY_LIMIT: '64kb',
            RATE_LIMIT_ENABLED: 'true',
            TRUST_PROXY_HOPS: '2'
        });

        assert.equal(config.corsAllowLocalhost, false);
        assert.deepEqual(config.corsAllowedOrigins, [
            'https://app.example.com',
            'https://admin.example.com'
        ]);
        assert.equal(config.globalRateLimitMax, 250);
        assert.equal(config.jsonBodyLimit, '64kb');
        assert.equal(config.rateLimitEnabled, true);
        assert.equal(config.trustProxyHops, 2);
    });

    it('usa valores seguros si los límites numéricos son inválidos', () => {
        const config = createHttpSecurityConfig({
            GLOBAL_RATE_LIMIT_MAX: '0',
            LOGIN_RATE_LIMIT_WINDOW_MS: '-1',
            REGISTRATION_RATE_LIMIT_MAX: 'no-es-un-número',
            TRUST_PROXY_HOPS: '-3'
        });

        assert.equal(
            config.globalRateLimitMax,
            DEFAULTS.globalRateLimitMax
        );
        assert.equal(
            config.loginRateLimitWindowMs,
            DEFAULTS.loginRateLimitWindowMs
        );
        assert.equal(
            config.registrationRateLimitMax,
            DEFAULTS.registrationRateLimitMax
        );
        assert.equal(config.trustProxyHops, DEFAULTS.trustProxyHops);
    });
});
