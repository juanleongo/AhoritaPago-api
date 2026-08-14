const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const {
    createUserControllerV2
} = require('../../src/controllers/v2/createUserController');
const {
    createGroupService
} = require('../../src/services/factories/createGroupService');
const {
    createUserService
} = require('../../src/services/factories/createUserService');

const projectRoot = path.resolve(__dirname, '../..');

describe('retiro de código muerto', () => {
    it('no conserva archivos index.js vacíos', () => {
        const removedIndexes = [
            'src/adapters/index.js',
            'src/models/index.js',
            'src/repositories/index.js',
            'src/routes/index.js',
            'src/services/index.js'
        ];

        assert.deepEqual(
            removedIndexes.filter(file => existsSync(path.join(
                projectRoot,
                file
            ))),
            []
        );
    });

    it('retira getAllUsers del servicio y controlador', () => {
        const service = createUserService({
            debtRepository: {},
            passwordHasher: {},
            transactionManager: {},
            userRepository: {}
        });
        const controller = createUserControllerV2({ userService: service });

        assert.equal('getAllUsers' in service, false);
        assert.equal('getAllUsers' in controller, false);
    });

    it('expone un único caso de uso para listar grupos del usuario', () => {
        const service = createGroupService({
            generateRandomCode() {},
            groupRepository: {},
            userRepository: {}
        });

        assert.equal(typeof service.getGroupsForUser, 'function');
        assert.equal('getAllGroups' in service, false);
    });
});
