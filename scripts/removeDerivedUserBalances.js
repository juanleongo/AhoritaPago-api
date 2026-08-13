require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const {
    removeDerivedUserBalances
} = require('../src/migrations/removeDerivedUserBalances');

const EXECUTE_FLAG = '--execute';
const CONFIRMATION_VALUE = 'REMOVE_DERIVED_BALANCES';

const run = async () => {
    const execute = process.argv.includes(EXECUTE_FLAG);

    try {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurada');
        }
        if (
            execute
            && process.env.CONFIRM_REMOVE_DERIVED_BALANCES
                !== CONFIRMATION_VALUE
        ) {
            throw new Error(
                `Para ejecutar usa ${EXECUTE_FLAG} y configura `
                + `CONFIRM_REMOVE_DERIVED_BALANCES=${CONFIRMATION_VALUE}`
            );
        }

        await mongoose.connect(process.env.DATABASE_URL);
        const report = await removeDerivedUserBalances({
            UserModel: User,
            execute
        });

        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
        console.error('No fue posible completar la migración:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

run();
