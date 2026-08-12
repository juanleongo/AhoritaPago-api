// Fachada de compatibilidad. El grafo principal importa la fábrica pura desde
// middlewares/factories/createHttpSecurity.js.
const { createHttpSecurityConfig } = require('../config/httpSecurity');
const {
    createHttpSecurity,
    isOriginAllowed
} = require('./factories/createHttpSecurity');

const defaultConfig = createHttpSecurityConfig();
const defaultHttpSecurity = createHttpSecurity(defaultConfig);

module.exports = {
    createHttpSecurity,
    defaultHttpSecurity,
    isOriginAllowed
};
