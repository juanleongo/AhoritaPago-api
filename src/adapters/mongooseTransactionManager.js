const defaultMongoose = require('mongoose');

const createMongooseTransactionManager = ({
    mongoose = defaultMongoose
} = {}) => ({
    async runInTransaction(work) {
        const session = await mongoose.startSession();
        let result;
        let transactionError;

        try {
            await session.withTransaction(async () => {
                result = await work(session);
            });
        } catch (error) {
            transactionError = error;
            throw error;
        } finally {
            try {
                await session.endSession();
            } catch (endSessionError) {
                if (!transactionError) {
                    throw endSessionError;
                }
            }
        }

        return result;
    }
});

module.exports = { createMongooseTransactionManager };
