const { it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Group = require('../../src/models/group');
const Debt = require('../../src/models/debt');
const debtRepository = require('../../src/repositories/debt');
const baseGroupRepository = require('../../src/repositories/group');
const {
    createMongooseTransactionManager
} = require('../../src/adapters/mongooseTransactionManager');
const {
    createDebtService
} = require('../../src/services/debt/createDebtService');
const {
    createGroupService
} = require('../../src/services/factories/createGroupService');

const createBarrier = expectedArrivals => {
    let arrivals = 0;
    let release;
    const ready = new Promise(resolve => { release = resolve; });

    return async () => {
        arrivals += 1;
        if (arrivals === expectedArrivals) {
            release();
        }
        await ready;
    };
};

it(
    'serializa crear una deuda y desactivar su grupo concurrentemente',
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
                dbName: 'ahoritapago-concurrency-test'
            });

            const creditorId = new mongoose.Types.ObjectId();
            const debtorId = new mongoose.Types.ObjectId();
            const group = await Group.create({
                admin: creditorId,
                code: 'RACE01',
                members: [creditorId, debtorId],
                name: 'Grupo concurrente'
            });
            const waitForBothTransactions = createBarrier(2);
            const groupRepository = {
                ...baseGroupRepository,
                async lockActiveById(id, options) {
                    await waitForBothTransactions();
                    return baseGroupRepository.lockActiveById(id, options);
                }
            };
            const transactionManager = createMongooseTransactionManager({
                mongoose
            });
            const debtService = createDebtService({
                debtRepository,
                groupRepository,
                transactionManager
            });
            const groupService = createGroupService({
                debtRepository,
                groupRepository,
                transactionManager
            });

            const [createResult, deactivateResult] = await Promise.allSettled([
                debtService.createDebt(
                    {
                        debtor: [debtorId],
                        description: 'Deuda concurrente',
                        group: group._id,
                        value: 100
                    },
                    { userId: creditorId }
                ),
                groupService.deleteGroup(group._id, creditorId)
            ]);

            const finalGroup = await Group.findById(group._id);
            const activeDebtCount = await Debt.countDocuments({
                group: group._id,
                state: true
            });
            const results = [createResult, deactivateResult];

            assert.equal(
                results.filter(result => result.status === 'fulfilled').length,
                1
            );
            assert.equal(
                results.filter(result => result.status === 'rejected').length,
                1
            );
            assert.equal(finalGroup.state === false && activeDebtCount > 0, false);

            if (createResult.status === 'fulfilled') {
                assert.equal(finalGroup.state, true);
                assert.equal(activeDebtCount, 1);
                assert.equal(
                    deactivateResult.reason.errorCode,
                    'GROUP_HAS_ACTIVE_DEBTS'
                );
            } else {
                assert.equal(finalGroup.state, false);
                assert.equal(activeDebtCount, 0);
                assert.equal(createResult.reason.errorCode, 'GROUP_NOT_FOUND');
            }
        } finally {
            await mongoose.disconnect();
            if (replicaSet) {
                await replicaSet.stop();
            }
        }
    }
);
