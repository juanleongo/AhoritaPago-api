const mongoose = require('mongoose');
const { createAppConfig } = require('../config/appConfig');

const createConnection = ({
    databaseUrl,
    logger = console,
    mongooseProvider = mongoose
}) => async () => {
    await mongooseProvider.connect(databaseUrl, {});
    logger.log('DB Connected');
};

const connection = async () => {
    const config = createAppConfig();
    return createConnection({ databaseUrl: config.database.url })();
};

module.exports = {
    connection,
    createConnection
};
