const { createAppConfig } = require('../../src/config/appConfig');

const VALID_ENV = Object.freeze({
    PORT: '3001',
    DATABASE_URL: 'mongodb://127.0.0.1:27017/ahoritapago-test',
    JWT_SECRET: 'test-secret-with-at-least-32-characters',
    LEGACY_API_LOG_USAGE: 'false'
});

const createTestAppConfig = (overrides = {}) => (
    createAppConfig({ ...VALID_ENV, ...overrides })
);

module.exports = {
    createTestAppConfig,
    VALID_ENV
};
