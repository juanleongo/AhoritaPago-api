const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Group = require('../../src/models/group');
const {
    createGroupService
} = require('../../src/services/factories/createGroupService');

const createTestService = ({
    codes,
    create,
    findByCode
}) => {
    const generatedCodes = [...codes];
    const calls = {
        create: [],
        findByCode: []
    };
    const service = createGroupService({
        generateRandomCode: () => generatedCodes.shift(),
        groupRepository: {
            async create(data) {
                calls.create.push(data);
                return create(data);
            },
            async findByCode(code) {
                calls.findByCode.push(code);
                return findByCode(code);
            },
            async findByName() {
                return null;
            }
        },
        userRepository: {}
    });

    return { calls, service };
};

const createGroup = service => service.createGroup(
    { name: 'Viaje' },
    { userId: 'user-1' }
);

describe('groupService: generación de códigos únicos', () => {
    it('crea el grupo en el primer intento si el código está libre', async () => {
        const { calls, service } = createTestService({
            codes: ['FREE01'],
            create: async data => ({ _id: 'group-1', ...data }),
            findByCode: async () => null
        });

        const group = await createGroup(service);

        assert.equal(group.code, 'FREE01');
        assert.deepEqual(calls.findByCode, ['FREE01']);
        assert.deepEqual(calls.create, [{
            name: 'Viaje',
            admin: 'user-1',
            code: 'FREE01',
            members: 'user-1'
        }]);
    });

    it('consulta cada código hasta encontrar uno disponible', async () => {
        const occupiedCodes = new Set(['USED01', 'USED02']);
        const { calls, service } = createTestService({
            codes: ['USED01', 'USED02', 'FREE01'],
            create: async data => data,
            findByCode: async code => (
                occupiedCodes.has(code) ? { code } : null
            )
        });

        const group = await createGroup(service);

        assert.equal(group.code, 'FREE01');
        assert.deepEqual(
            calls.findByCode,
            ['USED01', 'USED02', 'FREE01']
        );
        assert.equal(calls.create.length, 1);
    });

    it('reintenta si el índice único detecta una colisión concurrente', async () => {
        const duplicateCodeError = Object.assign(
            new Error('E11000 duplicate key index: code_1'),
            {
                code: 11000,
                keyPattern: { code: 1 },
                keyValue: { code: 'RACE01' }
            }
        );
        const { calls, service } = createTestService({
            codes: ['RACE01', 'FREE01'],
            create: async data => {
                if (data.code === 'RACE01') {
                    throw duplicateCodeError;
                }

                return data;
            },
            findByCode: async () => null
        });

        const group = await createGroup(service);

        assert.equal(group.code, 'FREE01');
        assert.deepEqual(calls.findByCode, ['RACE01', 'FREE01']);
        assert.deepEqual(
            calls.create.map(data => data.code),
            ['RACE01', 'FREE01']
        );
    });

    it('propaga errores de creación que no sean del código', async () => {
        const databaseError = Object.assign(
            new Error('E11000 duplicate key index: name_1'),
            {
                code: 11000,
                keyPattern: { name: 1 },
                keyValue: { name: 'Viaje' }
            }
        );
        const { calls, service } = createTestService({
            codes: ['FREE01', 'FREE02'],
            create: async () => {
                throw databaseError;
            },
            findByCode: async () => null
        });

        await assert.rejects(() => createGroup(service), databaseError);

        assert.deepEqual(calls.findByCode, ['FREE01']);
        assert.equal(calls.create.length, 1);
    });

    it('devuelve conflicto al agotar cinco intentos', async () => {
        const { calls, service } = createTestService({
            codes: ['USED01', 'USED02', 'USED03', 'USED04', 'USED05'],
            create: async data => data,
            findByCode: async code => ({ code })
        });

        await assert.rejects(
            () => createGroup(service),
            error => (
                error.statusCode === 409
                && error.errorCode === 'GROUP_CODE_CONFLICT'
            )
        );

        assert.deepEqual(
            calls.findByCode,
            ['USED01', 'USED02', 'USED03', 'USED04', 'USED05']
        );
        assert.equal(calls.create.length, 0);
    });

    it('conserva el índice único de MongoDB para el código', () => {
        assert.equal(Group.schema.path('code').options.unique, true);
    });
});
