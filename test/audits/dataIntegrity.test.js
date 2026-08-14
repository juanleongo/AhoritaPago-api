const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    auditDataIntegrity,
    auditUserIdentities,
    buildActiveBalancesPipeline,
    buildDebtIntegrityPipeline,
    findLegacyUniqueGroupNameIndexes
} = require('../../src/audits/dataIntegrity');

describe('auditoría de integridad de datos', () => {
    it('audita límites sin confundir identidades por mayúsculas', () => {
        const report = auditUserIdentities([
            {
                _id: 'user-1',
                name: 'Laura',
                nickname: 'leon',
                email: 'lomasFresa@gmail.com'
            },
            {
                _id: 'user-2',
                name: 'Lorenzo',
                nickname: 'LEON',
                email: 'lomasfresa@gmail.com'
            },
            {
                _id: 'user-3',
                name: ' A ',
                nickname: 'b'.repeat(51),
                email: 'correo-invalido'
            }
        ]);

        assert.equal(report.invalidCount, 1);
        assert.equal(report.invalidRecords[0].userId, 'user-3');
        assert.deepEqual(report.invalidRecords[0].issues, [
            'NAME_LENGTH_INVALID',
            'NAME_NOT_NORMALIZED',
            'NICKNAME_LENGTH_INVALID',
            'EMAIL_FORMAT_INVALID'
        ]);
    });

    it('incluye todas las reglas de deuda en la consulta', () => {
        const pipeline = JSON.stringify(buildDebtIntegrityPipeline());

        [
            'CREDITOR_REQUIRED',
            'DEBTOR_LIST_REQUIRED',
            'DEBTOR_CARDINALITY_INVALID',
            'DEBTOR_ITEM_INVALID',
            'DEBTOR_DUPLICATED',
            'CREDITOR_IS_DEBTOR',
            'VALUE_NOT_POSITIVE',
            'VALUE_NOT_INTEGER_COP',
            'VALUE_OUT_OF_SAFE_RANGE'
        ].forEach(issue => assert.match(pipeline, new RegExp(issue)));
    });

    it('calcula ambos lados del saldo desde deudas activas', () => {
        const pipeline = JSON.stringify(buildActiveBalancesPipeline());

        assert.match(pipeline, /\"state\":true/);
        assert.match(pipeline, /\"owe\"/);
        assert.match(pipeline, /\"owes\"/);
        assert.match(pipeline, /\$group/);
    });

    it('detecta únicamente índices globales únicos sobre name', () => {
        const indexes = [
            { key: { _id: 1 }, name: '_id_', unique: true },
            { key: { code: 1 }, name: 'code_1', unique: true },
            { key: { name: 1 }, name: 'name_1', unique: true },
            {
                key: { admin: 1, name: 1 },
                name: 'admin_1_name_1',
                unique: true
            }
        ];

        assert.deepEqual(findLegacyUniqueGroupNameIndexes(indexes), [
            { key: { name: 1 }, name: 'name_1', unique: true }
        ]);
    });

    it('genera un reporte usando solo consultas de lectura', async () => {
        const receivedPipelines = [];
        const invalidDebts = [{
            _id: 'debt-1',
            issues: ['VALUE_NOT_POSITIVE']
        }];
        const report = await auditDataIntegrity({
            DebtModel: {
                async aggregate(pipeline) {
                    receivedPipelines.push(pipeline);
                    return receivedPipelines.length === 1
                        ? invalidDebts
                        : [{ userId: 'user-1', owe: 25, owes: 50 }];
                }
            },
            GroupModel: {
                collection: {
                    async indexes() {
                        return [
                            {
                                key: { name: 1 },
                                name: 'name_1',
                                unique: true
                            }
                        ];
                    }
                }
            },
            UserModel: {
                collection: {
                    find() {
                        return {
                            async toArray() {
                                return [{
                                    _id: 'user-1',
                                    email: 'user@example.com',
                                    name: 'Usuario',
                                    nickname: 'usuario',
                                    owe: 10,
                                    owes: 50
                                }];
                            }
                        };
                    }
                }
            }
        });

        assert.deepEqual(
            receivedPipelines[0],
            buildDebtIntegrityPipeline()
        );
        assert.deepEqual(
            receivedPipelines[1],
            buildActiveBalancesPipeline()
        );
        assert.equal(report.readOnly, true);
        assert.equal(report.debts.invalidCount, 1);
        assert.equal(report.debts.invalidRecords, invalidDebts);
        assert.equal(report.balances.legacyFieldCount, 1);
        assert.equal(report.balances.mismatchCount, 1);
        assert.equal(report.users.invalidCount, 0);
        assert.deepEqual(report.balances.mismatches[0], {
            userId: 'user-1',
            stored: { owe: 10, owes: 50 },
            derived: { owe: 25, owes: 50 }
        });
        assert.equal(report.groups.legacyUniqueNameIndexCount, 1);
        assert.equal(report.groups.legacyUniqueNameIndexes[0].name, 'name_1');
        assert.ok(!Number.isNaN(Date.parse(report.generatedAt)));
    });
});
