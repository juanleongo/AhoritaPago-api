const { it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Debt = require('../../src/models/debt');
const debtRepository = require('../../src/repositories/debt');
const { debtResponseDto } = require('../../src/dtos/output/debtResponseDtos');
const {
    convertDebtValuesToCopIntegers
} = require('../../src/migrations/convertDebtValuesToCopIntegers');

it(
    'persiste, suma y migra importes COP como enteros Int64',
    { timeout: 180000 },
    async () => {
        let mongoServer;

        try {
            mongoServer = await MongoMemoryServer.create();
            await mongoose.connect(mongoServer.getUri(), {
                dbName: 'ahoritapago-cop-money-test'
            });

            const creditorId = new mongoose.Types.ObjectId();
            const debtorId = new mongoose.Types.ObjectId();
            const groupId = new mongoose.Types.ObjectId();
            const debt = await Debt.create({
                creditor: creditorId,
                debtor: [debtorId],
                description: 'Compra en COP',
                group: groupId,
                value: 1500
            });
            const storedDebt = await Debt.collection.findOne(
                { _id: debt._id },
                { promoteValues: false }
            );
            const balance = await debtRepository.getActiveBalanceByUserId(
                debtorId
            );

            assert.equal(storedDebt.value.constructor.name, 'Long');
            assert.equal(storedDebt.value.toString(), '1500');
            assert.equal(debt.value, 1500n);
            assert.equal(debtResponseDto(debt).value, 1500);
            assert.deepEqual(balance, { owe: 1500, owes: 0 });

            const legacyDebtId = new mongoose.Types.ObjectId();
            await Debt.collection.insertOne({
                _id: legacyDebtId,
                creditor: creditorId,
                debtor: [debtorId],
                description: 'Valor entero anterior',
                group: groupId,
                state: true,
                debtDate: new Date(),
                value: 2500
            });
            const readableLegacyDebt = await Debt.findById(legacyDebtId);

            assert.equal(readableLegacyDebt.value, 2500n);

            const dryRun = await convertDebtValuesToCopIntegers({
                DebtModel: Debt
            });
            assert.equal(dryRun.totalCount, 2);
            assert.equal(dryRun.longCount, 1);
            assert.equal(dryRun.pendingCount, 1);
            assert.equal(dryRun.invalidCount, 0);

            const migration = await convertDebtValuesToCopIntegers({
                DebtModel: Debt,
                execute: true
            });
            const migratedDebt = await Debt.collection.findOne(
                { _id: legacyDebtId },
                { promoteValues: false }
            );

            assert.equal(migration.modifiedCount, 1);
            assert.equal(migration.remainingCount, 0);
            assert.equal(migratedDebt.value.constructor.name, 'Long');
            assert.equal(migratedDebt.value.toString(), '2500');
        } finally {
            await mongoose.disconnect();
            if (mongoServer) {
                await mongoServer.stop();
            }
        }
    }
);
