const { it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Debt = require('../../src/models/debt');
const Group = require('../../src/models/group');
require('../../src/models/user');
const debtRepository = require('../../src/repositories/debt');
const groupRepository = require('../../src/repositories/group');
const {
    createMongooseTransactionManager
} = require('../../src/adapters/mongooseTransactionManager');
const {
    createDebtService
} = require('../../src/services/debt/createDebtService');

it(
    'conserva la deuda pagada y la mueve al historial de pagadas',
    { timeout: 180000 },
    async () => {
        let replicaSet;

        try {
            replicaSet = await MongoMemoryReplSet.create({
                replSet: {
                    count: 1,
                    storageEngine: 'wiredTiger'
                }
            });
            await mongoose.connect(replicaSet.getUri(), {
                dbName: 'ahoritapago-paid-history-test'
            });

            const creditorId = new mongoose.Types.ObjectId();
            const debtorId = new mongoose.Types.ObjectId();
            const group = await Group.create({
                admin: creditorId,
                code: 'PAID01',
                members: [creditorId, debtorId],
                name: 'Grupo historial'
            });
            const debt = await Debt.create({
                creditor: creditorId,
                debtor: [debtorId],
                description: 'Deuda que será pagada',
                group: group._id,
                state: true,
                value: 80
            });
            const debtService = createDebtService({
                debtRepository,
                groupRepository,
                transactionManager: createMongooseTransactionManager({
                    mongoose
                })
            });

            await debtService.markAsPaid(debt._id, debtorId);

            const storedDebt = await Debt.findById(debt._id);
            const history = await debtService.getDebtHistoryForUser(
                creditorId,
                { activePage: 1, paidPage: 1, limit: 20 }
            );
            const balance = await debtRepository.getActiveBalanceByUserId(
                creditorId
            );

            assert.ok(storedDebt);
            assert.equal(await Debt.countDocuments({ _id: debt._id }), 1);
            assert.equal(storedDebt.state, false);
            assert.ok(storedDebt.paymentDate instanceof Date);
            assert.deepEqual(history.active, []);
            assert.equal(history.paid.length, 1);
            assert.equal(history.paid[0]._id.toString(), debt._id.toString());
            assert.deepEqual(history.count, {
                total: 1,
                active: 0,
                paid: 1
            });
            assert.deepEqual(balance, { owe: 0, owes: 0 });
        } finally {
            await mongoose.disconnect();
            if (replicaSet) {
                await replicaSet.stop();
            }
        }
    }
);
