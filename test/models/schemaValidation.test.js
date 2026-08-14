const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Debt = require('../../src/models/debt');
const Group = require('../../src/models/group');
const User = require('../../src/models/user');

const ids = {
    creditor: '507f1f77bcf86cd799439011',
    debtor: '507f191e810c19729de860ea',
    group: '507f191e810c19729de860eb'
};

const buildDebt = changes => new Debt({
    description: '  Cena  ',
    creditor: ids.creditor,
    debtor: [ids.debtor],
    group: ids.group,
    value: 100,
    ...changes
});

const rejectsPath = path => error => Boolean(error.errors?.[path]);

describe('integridad de los esquemas Mongoose', () => {
    it('preserva mayúsculas de email y nickname al validar usuarios', async () => {
        const user = new User({
            name: '  Laura   Gómez  ',
            nickname: '  LEON  ',
            email: '  lomasFresa@gmail.com  ',
            password: 'hash'
        });

        await user.validate();

        assert.equal(user.name, 'Laura Gómez');
        assert.equal(user.nickname, 'LEON');
        assert.equal(user.email, 'lomasFresa@gmail.com');
    });

    it('limita la longitud de los datos de identidad', async () => {
        const user = new User({
            name: 'a'.repeat(81),
            nickname: 'b'.repeat(51),
            email: `${'c'.repeat(250)}@x.io`,
            password: 'hash'
        });

        await assert.rejects(
            () => user.validate(),
            error => (
                Boolean(error.errors?.name)
                && Boolean(error.errors?.nickname)
                && Boolean(error.errors?.email)
            )
        );
    });

    it('mantiene índices únicos sensibles a mayúsculas', () => {
        const identityIndexes = User.schema.indexes().filter(
            ([fields, options]) => (
                options.unique === true
                && (fields.email === 1 || fields.nickname === 1)
            )
        );

        assert.equal(identityIndexes.length, 2);
        identityIndexes.forEach(([, options]) => {
            assert.equal(options.unique, true);
            assert.equal(options.collation, undefined);
        });
    });

    it('acepta una deuda válida y normaliza su descripción', async () => {
        const debt = buildDebt();

        await debt.validate();

        assert.equal(debt.description, 'Cena');
        assert.equal(debt.value, 100n);
        assert.equal(Debt.schema.path('value').instance, 'BigInt');
    });

    it('requiere un acreedor', async () => {
        await assert.rejects(
            () => buildDebt({ creditor: undefined }).validate(),
            rejectsPath('creditor')
        );
    });

    it('requiere al menos un deudor y rechaza elementos nulos', async () => {
        await assert.rejects(
            () => buildDebt({ debtor: [] }).validate(),
            rejectsPath('debtor')
        );
        await assert.rejects(
            () => buildDebt({ debtor: [null] }).validate(),
            rejectsPath('debtor.0')
        );
    });

    it('rechaza deudores repetidos', async () => {
        await assert.rejects(
            () => buildDebt({
                debtor: [ids.debtor, ids.debtor]
            }).validate(),
            rejectsPath('debtor')
        );
    });

    it('persiste una deuda independiente por cada deudor', async () => {
        await assert.rejects(
            () => buildDebt({
                debtor: [
                    ids.debtor,
                    '507f191e810c19729de860ec'
                ]
            }).validate(),
            rejectsPath('debtor')
        );
    });

    it('impide que el acreedor también sea deudor', async () => {
        await assert.rejects(
            () => buildDebt({ debtor: [ids.creditor] }).validate(),
            rejectsPath('debtor')
        );
    });

    for (const invalidValue of [undefined, 0, -1, 1.5, Infinity]) {
        it(`rechaza el valor inválido ${String(invalidValue)}`, async () => {
            await assert.rejects(
                () => buildDebt({ value: invalidValue }).validate(),
                rejectsPath('value')
            );
        });
    }

    it('normaliza nombres de grupo sin exigir unicidad global', async () => {
        const group = new Group({
            name: '  Viaje  ',
            admin: ids.creditor,
            members: [ids.creditor],
            code: 'ABC123'
        });

        await group.validate();

        assert.equal(group.name, 'Viaje');
        assert.notEqual(Group.schema.path('name').options.unique, true);
        assert.equal(Group.schema.path('code').options.unique, true);
    });

    it('declara índices para historial, participantes y grupos', () => {
        const indexes = new Map(
            Debt.schema.indexes().map(([fields, options]) => [
                options.name,
                fields
            ])
        );

        assert.deepEqual(
            indexes.get('debt_creditor_state_debt_date'),
            { creditor: 1, state: 1, debtDate: -1, _id: -1 }
        );
        assert.deepEqual(
            indexes.get('debt_debtor_state_debt_date'),
            { debtor: 1, state: 1, debtDate: -1, _id: -1 }
        );
        assert.deepEqual(
            indexes.get('debt_creditor_state_payment_date'),
            {
                creditor: 1,
                state: 1,
                paymentDate: -1,
                debtDate: -1,
                _id: -1
            }
        );
        assert.deepEqual(
            indexes.get('debt_debtor_state_payment_date'),
            {
                debtor: 1,
                state: 1,
                paymentDate: -1,
                debtDate: -1,
                _id: -1
            }
        );
        assert.deepEqual(
            indexes.get('debt_group_state_creditor'),
            { group: 1, state: 1, creditor: 1 }
        );
        assert.deepEqual(
            indexes.get('debt_group_state_debtor'),
            { group: 1, state: 1, debtor: 1 }
        );
        assert.deepEqual(
            indexes.get('debt_group_creditor_active_page'),
            {
                group: 1,
                state: 1,
                creditor: 1,
                debtDate: -1,
                _id: -1
            }
        );
        assert.deepEqual(
            indexes.get('debt_group_debtor_active_page'),
            {
                group: 1,
                state: 1,
                debtor: 1,
                debtDate: -1,
                _id: -1
            }
        );
    });

    it('declara un índice para grupos activos paginados por integrante', () => {
        const index = Group.schema.indexes().find(
            ([, options]) => options.name === 'group_member_active_page'
        );

        assert.ok(index);
        assert.deepEqual(index[0], { members: 1, state: 1, _id: -1 });
    });

    it('declara un índice para búsqueda y orden de nicknames activos', () => {
        const index = User.schema.indexes().find(
            ([, options]) => options.name === 'user_state_nickname'
        );

        assert.ok(index);
        assert.deepEqual(index[0], { state: 1, nickname: 1, _id: 1 });
    });

    it('no persiste saldos derivados en el usuario', () => {
        assert.equal(User.schema.path('owe'), undefined);
        assert.equal(User.schema.path('owes'), undefined);
    });
});
