const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createHttpSecurityConfig
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

    it('rechaza límites numéricos inválidos en lugar de ocultarlos', () => {
        assert.throws(
            () => createHttpSecurityConfig({
                GLOBAL_RATE_LIMIT_MAX: '0',
                LOGIN_RATE_LIMIT_WINDOW_MS: '-1',
                REGISTRATION_RATE_LIMIT_MAX: 'no-es-un-número',
                TRUST_PROXY_HOPS: '-3'
            }),
            error => {
                assert.equal(error.code, 'INVALID_CONFIGURATION');
                assert.deepEqual(
                    error.details.map(detail => detail.variable),
                    [
                        'GLOBAL_RATE_LIMIT_MAX',
                        'LOGIN_RATE_LIMIT_WINDOW_MS',
                        'REGISTRATION_RATE_LIMIT_MAX',
                        'TRUST_PROXY_HOPS'
                    ]
                );
                return true;
            }
        );
    });

    it('rechaza booleanos, orígenes y tamaños inválidos', () => {
        assert.throws(
            () => createHttpSecurityConfig({
                CORS_ALLOW_LOCALHOST: 'sí',
                CORS_ALLOWED_ORIGINS: 'https://app.example.com/path',
                JSON_BODY_LIMIT: 'sin-límite',
                RATE_LIMIT_ENABLED: 'enabled'
            }),
            error => {
                assert.deepEqual(
                    error.details.map(detail => detail.variable),
                    [
                        'CORS_ALLOW_LOCALHOST',
                        'CORS_ALLOWED_ORIGINS',
                        'JSON_BODY_LIMIT',
                        'RATE_LIMIT_ENABLED'
                    ]
                );
                return true;
            }
        );
    });
});
