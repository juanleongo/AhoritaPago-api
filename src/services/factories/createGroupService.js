const { createHttpError } = require('../../helpers/httpError');
const { PAGINATION } = require('../../config/pagination');
const { createPaginationMetadata } = require('../../helpers/pagination');

const MAX_GROUP_CODE_ATTEMPTS = 5;

const isGroupCodeDuplicateError = error => (
    error?.code === 11000
    && (
        error.keyPattern?.code
        || Object.prototype.hasOwnProperty.call(
            error.keyValue || {},
            'code'
        )
        || error.message?.includes('code_1')
    )
);

const isSameId = (firstId, secondId) => (
    firstId && secondId && firstId.toString() === secondId.toString()
);

const isGroupMember = (group, userId) => (
    group.members.some(memberId => isSameId(memberId, userId))
);

const createGroupService = ({
    groupRepository,
    userRepository,
    generateRandomCode
}) => {
    const getGroupsForUser = async (userId, pagination = {}) => {
        const page = pagination.page ?? PAGINATION.defaultPage;
        const limit = pagination.limit ?? PAGINATION.defaultLimit;
        const [groups, count] = await Promise.all([
            groupRepository.findAllActiveByUser(userId, { page, limit }),
            groupRepository.countAllActiveByUser(userId)
        ]);

        return {
            count,
            pagination: createPaginationMetadata(count, page, limit),
            groups
        };
    };

    const getGroupById = async (id, userId) => {
        const group = await groupRepository.findActiveById(id);
        if (!group) {
            throw createHttpError(
                404,
                'Grupo no encontrado',
                'GROUP_NOT_FOUND'
            );
        }

        if (!isGroupMember(group, userId)) {
            throw createHttpError(
                403,
                'No tienes permiso para consultar este grupo',
                'GROUP_ACCESS_FORBIDDEN'
            );
        }

        return group;
    };

    const createGroup = async (groupData, userData) => {
        if (!groupData.name) {
            throw createHttpError(
                400,
                'El nombre del grupo es obligatorio',
                'GROUP_NAME_REQUIRED'
            );
        }

        for (
            let attempt = 0;
            attempt < MAX_GROUP_CODE_ATTEMPTS;
            attempt += 1
        ) {
            const code = generateRandomCode();
            const existingCode = await groupRepository.findByCode(code);

            if (existingCode) {
                continue;
            }

            try {
                return await groupRepository.create({
                    name: groupData.name,
                    admin: userData.userId,
                    code,
                    members: userData.userId
                });
            } catch (error) {
                if (!isGroupCodeDuplicateError(error)) {
                    throw error;
                }
            }
        }

        throw createHttpError(
            409,
            'No fue posible generar un código único para el grupo',
            'GROUP_CODE_CONFLICT'
        );
    };

    const updateGroup = async (id, groupData, authenticatedUserId) => {
        const existingGroup = await groupRepository.findActiveById(id);
        if (!existingGroup) {
            throw createHttpError(
                404,
                'Grupo no encontrado',
                'GROUP_NOT_FOUND'
            );
        }

        if (!isSameId(existingGroup.admin, authenticatedUserId)) {
            throw createHttpError(
                403,
                'Solo el administrador puede modificar el grupo',
                'GROUP_UPDATE_FORBIDDEN'
            );
        }

        if (!Object.prototype.hasOwnProperty.call(groupData, 'name')) {
            throw createHttpError(
                400,
                'Solo se permite actualizar el nombre del grupo',
                'GROUP_UPDATE_FIELDS_INVALID'
            );
        }

        return groupRepository.updateById(id, { name: groupData.name });
    };

    const deleteGroup = async (id, authenticatedUserId) => {
        const existingGroup = await groupRepository.findActiveById(id);
        if (!existingGroup) {
            throw createHttpError(
                404,
                'Grupo no encontrado',
                'GROUP_NOT_FOUND'
            );
        }

        if (!isSameId(existingGroup.admin, authenticatedUserId)) {
            throw createHttpError(
                403,
                'Solo el administrador puede eliminar el grupo',
                'GROUP_DELETE_FORBIDDEN'
            );
        }

        return groupRepository.deactivateById(id);
    };

    const addMemberToGroup = async (groupCode, userNick, requesterId) => {
        const group = await groupRepository.findActiveByCode(groupCode);
        if (!group) {
            throw createHttpError(
                404,
                'El grupo no existe',
                'GROUP_NOT_FOUND'
            );
        }

        if (!isGroupMember(group, requesterId)) {
            throw createHttpError(
                403,
                'Solo un integrante del grupo puede agregar miembros',
                'GROUP_MEMBER_ADD_FORBIDDEN'
            );
        }

        const user = await userRepository.findActiveByNickname(userNick);
        if (!user) {
            throw createHttpError(
                404,
                'El usuario no existe',
                'USER_NOT_FOUND'
            );
        }

        if (isGroupMember(group, user._id)) {
            throw createHttpError(
                409,
                'El usuario ya es miembro del grupo',
                'USER_ALREADY_GROUP_MEMBER'
            );
        }

        return groupRepository.addMemberById(
            group._id,
            user._id
        );
    };

    return {
        addMemberToGroup,
        createGroup,
        deleteGroup,
        getGroupById,
        getGroupsForUser,
        updateGroup
    };
};

module.exports = { createGroupService };
