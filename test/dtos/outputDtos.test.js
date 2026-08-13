const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    createSuccessResponse
} = require('../../src/dtos/output/responseDto');
const {
    userResponseDto,
    userSummaryDto
} = require('../../src/dtos/output/userResponseDtos');
const {
    groupResponseDto
} = require('../../src/dtos/output/groupResponseDtos');
const {
    debtResponseDto,
    debtSummaryDto
} = require('../../src/dtos/output/debtResponseDtos');

describe('DTO de salida v2', () => {
    it('construye un envelope estable y omite propiedades opcionales', () => {
        assert.deepEqual(createSuccessResponse({ data: [] }), {
            success: true,
            data: []
        });
        assert.deepEqual(createSuccessResponse({
            data: null,
            meta: { count: 0 },
            message: 'Completado'
        }), {
            success: true,
            data: null,
            meta: { count: 0 },
            message: 'Completado'
        });
    });

    it('expone el perfil sin detalles de Mongoose ni contraseña', () => {
        const result = userResponseDto({
            _id: 'user-1',
            __v: 4,
            name: 'Laura',
            nickname: 'laura',
            email: 'laura@example.com',
            password: 'hash',
            state: true,
            google: false,
            owe: 20,
            owes: 45
        });

        assert.deepEqual(result, {
            id: 'user-1',
            name: 'Laura',
            nickname: 'laura',
            email: 'laura@example.com',
            state: true,
            owe: 20,
            owes: 45
        });
        assert.equal('password' in result, false);
        assert.equal('_id' in result, false);
        assert.equal('__v' in result, false);
    });

    it('limita la vista pública de una búsqueda de usuarios', () => {
        assert.deepEqual(userSummaryDto({
            uid: 'user-1',
            name: 'Laura',
            nickname: 'laura',
            email: 'private@example.com'
        }), {
            id: 'user-1',
            name: 'Laura',
            nickname: 'laura'
        });
    });

    it('normaliza grupos y referencias de usuarios', () => {
        assert.deepEqual(groupResponseDto({
            _id: 'group-1',
            name: 'Viaje',
            state: true,
            code: 'ABC123',
            admin: { _id: 'admin-1', nickname: 'admin' },
            members: ['admin-1', { _id: 'user-2', name: 'Laura' }],
            __v: 2
        }), {
            id: 'group-1',
            name: 'Viaje',
            state: true,
            code: 'ABC123',
            admin: { id: 'admin-1', nickname: 'admin' },
            members: [
                { id: 'admin-1' },
                { id: 'user-2', name: 'Laura' }
            ]
        });
    });

    it('normaliza una deuda y sus referencias pobladas', () => {
        assert.deepEqual(debtResponseDto({
            _id: 'debt-1',
            description: 'Cena',
            state: true,
            creditor: { _id: 'user-1', name: 'Laura' },
            debtor: [{ _id: 'user-2', nickname: 'leon' }],
            value: 50,
            group: { _id: 'group-1', name: 'Amigos', code: 'ABC123' },
            debtDate: '2026-08-01T00:00:00.000Z',
            __v: 1
        }), {
            id: 'debt-1',
            description: 'Cena',
            state: true,
            creditor: { id: 'user-1', name: 'Laura' },
            debtor: [{ id: 'user-2', nickname: 'leon' }],
            value: 50,
            group: { id: 'group-1', name: 'Amigos', code: 'ABC123' },
            debtDate: '2026-08-01T00:00:00.000Z'
        });
    });

    it('limita los elementos del resumen financiero', () => {
        assert.deepEqual(debtSummaryDto({
            debts: [{
                description: 'Cena',
                group: 'Amigos',
                date: '2026-08-01',
                amount: 50,
                with: 'Laura',
                internal: true
            }],
            credits: []
        }), {
            debts: [{
                description: 'Cena',
                group: 'Amigos',
                date: '2026-08-01',
                amount: 50,
                with: 'Laura'
            }],
            credits: []
        });
    });
});
