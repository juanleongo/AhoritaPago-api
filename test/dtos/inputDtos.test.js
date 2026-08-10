const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loginDto } = require('../../src/dtos/authDtos');
const { createDebtDto, updateDebtDto } = require('../../src/dtos/debtDtos');
const {
    addGroupMemberDto,
    createGroupDto,
    updateGroupDto
} = require('../../src/dtos/groupDtos');
const {
    createUserDto,
    nicknameLookupDto,
    updateUserDto
} = require('../../src/dtos/userDtos');

describe('DTO de entrada', () => {
    it('el DTO de autenticación conserva solo credenciales', () => {
        assert.deepEqual(loginDto({
            email: 'user@example.com',
            password: 'secreto',
            admin: true
        }), {
            email: 'user@example.com',
            password: 'secreto'
        });
    });

    it('los DTO de usuario descartan campos internos', () => {
        assert.deepEqual(createUserDto({
            name: 'Laura',
            nickname: 'laura',
            email: 'laura@example.com',
            password: 'secreto',
            state: false,
            owe: 5000,
            owes: 8000
        }), {
            name: 'Laura',
            nickname: 'laura',
            email: 'laura@example.com',
            password: 'secreto'
        });

        assert.deepEqual(updateUserDto({
            name: 'Nuevo nombre',
            password: 'no-permitido',
            state: false
        }), {
            name: 'Nuevo nombre'
        });

        assert.deepEqual(nicknameLookupDto({
            nick: 'laura',
            email: 'no-permitido@example.com'
        }), {
            nick: 'laura'
        });
    });

    it('los DTO de grupo conservan únicamente su contrato', () => {
        assert.deepEqual(createGroupDto({
            name: 'Viaje',
            admin: 'otro-admin'
        }), { name: 'Viaje' });

        assert.deepEqual(updateGroupDto({
            name: 'Viaje 2026',
            members: ['otro-usuario']
        }), { name: 'Viaje 2026' });

        assert.deepEqual(addGroupMemberDto({
            groupCode: 'ABC123',
            userNick: 'nuevo',
            requesterId: 'falso'
        }), {
            groupCode: 'ABC123',
            userNick: 'nuevo'
        });
    });

    it('los DTO de deuda bloquean estado, acreedor y fechas', () => {
        assert.deepEqual(createDebtDto({
            description: 'Cena',
            value: 50000,
            group: 'group-id',
            debtor: ['debtor-id'],
            creditor: 'otro-acreedor',
            state: false,
            debtDate: '2026-01-01'
        }), {
            description: 'Cena',
            value: 50000,
            group: 'group-id',
            debtor: ['debtor-id']
        });

        assert.deepEqual(updateDebtDto({
            description: 'Cena actualizada',
            value: 1,
            state: false
        }), {
            description: 'Cena actualizada'
        });
    });
});
