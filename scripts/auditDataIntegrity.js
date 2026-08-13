require('dotenv').config();
const mongoose = require('mongoose');
const Debt = require('../src/models/debt');
const Group = require('../src/models/group');
const User = require('../src/models/user');
const { auditDataIntegrity } = require('../src/audits/dataIntegrity');

const run = async () => {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurada');
        }

        await mongoose.connect(process.env.DATABASE_URL);
        const report = await auditDataIntegrity({
            DebtModel: Debt,
            GroupModel: Group,
            UserModel: User
        });

        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
        console.error('No fue posible completar la auditoría:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

run();
