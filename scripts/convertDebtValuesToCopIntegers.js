require('dotenv').config();
const mongoose = require('mongoose');
const Debt = require('../src/models/debt');
const {
    convertDebtValuesToCopIntegers
} = require('../src/migrations/convertDebtValuesToCopIntegers');

const EXECUTE_FLAG = '--execute';
const CONFIRMATION_VARIABLE = 'CONFIRM_COP_MONEY_MIGRATION';
const CONFIRMATION_VALUE = 'CONVERT_DEBT_VALUES_TO_COP_INTEGERS';

const run = async () => {
    const execute = process.argv.includes(EXECUTE_FLAG);

    try {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurada');
        }
        if (
            execute
            && process.env[CONFIRMATION_VARIABLE] !== CONFIRMATION_VALUE
        ) {
            throw new Error(
                `Para ejecutar usa ${EXECUTE_FLAG} y configura `
                + `${CONFIRMATION_VARIABLE}=${CONFIRMATION_VALUE}`
            );
        }

        await mongoose.connect(process.env.DATABASE_URL);
        const report = await convertDebtValuesToCopIntegers({
            DebtModel: Debt,
            execute
        });

        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
        console.error('No fue posible completar la migración:', error.message);
        if (error.audit) {
            console.error(JSON.stringify(error.audit, null, 2));
        }
        if (error.migration) {
            console.error(JSON.stringify(error.migration, null, 2));
        }
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

run();
