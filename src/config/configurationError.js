class ConfigurationError extends Error {
    constructor(details) {
        const detailLines = details.map(
            detail => `- ${detail.variable}: ${detail.message}`
        );

        super(['Configuración inválida:', ...detailLines].join('\n'));
        this.name = 'ConfigurationError';
        this.code = 'INVALID_CONFIGURATION';
        this.details = details;
    }
}

module.exports = { ConfigurationError };
