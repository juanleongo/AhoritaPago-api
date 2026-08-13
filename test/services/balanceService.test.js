const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createBalanceService
} = require('../../src/services/balance/createBalanceService');

describe('balanceService: saldos derivados', () => {
    it('combina el usuario público con sus saldos activos', async () => {
        const calls = [];
        const balanceService = createBalanceService({
            debtRepository: {
                async getActiveBalanceByUserId(userId, options) {
                    calls.push([userId, options]);
                    return { owe: 25, owes: 60 };
                }
            }
        });
        const user = {
            _id: 'user-1',
            __v: 0,
            name: 'Usuario',
            password: 'hash',
            state: true
        };

        const result = await balanceService.withActiveBalance(user);

        assert.deepEqual(calls, [['user-1', {}]]);
        assert.deepEqual(result, {
            uid: 'user-1',
            name: 'Usuario',
            state: true,
            owe: 25,
            owes: 60
        });
    });

    it('respeta la serialización pública del modelo', async () => {
        const balanceService = createBalanceService({
            debtRepository: {
                async getActiveBalanceByUserId() {
                    return { owe: 10, owes: 20 };
                }
            }
        });
        const user = {
            _id: 'user-1',
            toJSON() {
                return { uid: this._id, nickname: 'usuario' };
            }
        };

        assert.deepEqual(
            await balanceService.withActiveBalance(user),
            {
                uid: 'user-1',
                nickname: 'usuario',
                owe: 10,
                owes: 20
            }
        );
    });

    it('normaliza resultados ausentes o no numéricos a cero', async () => {
        const balanceService = createBalanceService({
            debtRepository: {
                async getActiveBalanceByUserId() {
                    return { owe: undefined, owes: '20' };
                }
            }
        });

        assert.deepEqual(
            await balanceService.getActiveBalanceForUser('user-1'),
            { owe: 0, owes: 0 }
        );
    });
});
