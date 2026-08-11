require('dotenv').config();
const { createAppConfig } = require('./src/config/appConfig');

const startServer = async ({
    env = process.env,
    loadServer = () => require('./src/models/server'),
    logger = console,
    setExitCode = exitCode => {
        process.exitCode = exitCode;
    }
} = {}) => {
    try {
        const config = createAppConfig(env);
        const Server = loadServer();
        const server = new Server({ config });

        await server.start();
        return server;
    } catch (error) {
        logger.error(
            'No fue posible iniciar la aplicación:',
            error.message
        );
        setExitCode(1);
        return null;
    }
};

if (require.main === module) {
    startServer();
}

module.exports = { startServer };
