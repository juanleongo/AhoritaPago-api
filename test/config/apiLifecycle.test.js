const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createApiLifecycleConfig,
    DEFAULTS
} = require('../../src/config/apiLifecycle');

describe('configuración del ciclo de vida HTTP', () => {
    it('define una transición legacy segura por defecto', () => {
        assert.deepEqual(createApiLifecycleConfig(), DEFAULTS);
    });

    it('normaliza fechas e interruptores configurables', () => {
        assert.deepEqual(createApiLifecycleConfig({
            LEGACY_API_DEPRECATION_DATE: '2026-09-01T00:00:00Z',
            LEGACY_API_ENABLED: 'false',
            LEGACY_API_LOG_USAGE: 'false',
            LEGACY_API_SUNSET_DATE: '2027-03-01T00:00:00Z'
        }), {
            legacyApiDeprecationDate: '2026-09-01T00:00:00.000Z',
            legacyApiEnabled: false,
            legacyApiLogUsage: false,
            legacyApiSunsetDate: '2027-03-01T00:00:00.000Z'
        });
    });

    it('rechaza fechas inválidas, orden incorrecto y booleanos ambiguos', () => {
        assert.throws(
            () => createApiLifecycleConfig({
                LEGACY_API_DEPRECATION_DATE: 'no-date',
                LEGACY_API_ENABLED: 'yes',
                LEGACY_API_SUNSET_DATE: '2025-01-01T00:00:00Z'
            }),
            error => {
                assert.deepEqual(
                    error.details.map(detail => detail.variable),
                    [
                        'LEGACY_API_DEPRECATION_DATE',
                        'LEGACY_API_SUNSET_DATE',
                        'LEGACY_API_ENABLED'
                    ]
                );
                return true;
            }
        );
    });
});
