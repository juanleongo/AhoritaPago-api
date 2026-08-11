const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    auditDataIntegrity,
    buildDebtIntegrityPipeline,
    findLegacyUniqueGroupNameIndexes
} = require('../../src/audits/dataIntegrity');

describe('auditoría de integridad de datos', () => {
    it('incluye todas las reglas de deuda en la consulta', () => {
        const pipeline = JSON.stringify(buildDebtIntegrityPipeline());

        [
            'CREDITOR_REQUIRED',
            'DEBTOR_LIST_REQUIRED',
            'DEBTOR_ITEM_INVALID',
            'DEBTOR_DUPLICATED',
            'CREDITOR_IS_DEBTOR',
            'VALUE_NOT_POSITIVE'
        ].forEach(issue => assert.match(pipeline, new RegExp(issue)));
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
        let receivedPipeline;
        const invalidDebts = [{
            _id: 'debt-1',
            issues: ['VALUE_NOT_POSITIVE']
        }];
        const report = await auditDataIntegrity({
            DebtModel: {
                async aggregate(pipeline) {
                    receivedPipeline = pipeline;
                    return invalidDebts;
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
            }
        });

        assert.deepEqual(receivedPipeline, buildDebtIntegrityPipeline());
        assert.equal(report.readOnly, true);
        assert.equal(report.debts.invalidCount, 1);
        assert.equal(report.debts.invalidRecords, invalidDebts);
        assert.equal(report.groups.legacyUniqueNameIndexCount, 1);
        assert.equal(report.groups.legacyUniqueNameIndexes[0].name, 'name_1');
        assert.ok(!Number.isNaN(Date.parse(report.generatedAt)));
    });
});
