const { createHttpError } = require('../../helpers/httpError');

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
    const getAllGroups = async userId => (
        groupRepository.getAllGroupsByUser(userId)
    );

    const getGroupById = async (id, userId) => {
        const group = await groupRepository.getGroupyId(id);
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

    const getGroupsForUser = async userId => {
        const groups = await groupRepository.getAllGroupsByUser(userId);

        if (!groups || groups.length === 0) {
            return {
                success: true,
                data: [],
                message: 'El usuario no pertenece a ningún grupo.'
            };
        }

        return { success: true, data: groups };
    };

    const createGroup = async (groupData, userData) => {
        if (!groupData.name) {
            throw createHttpError(
                400,
                'El nombre del grupo es obligatorio',
                'GROUP_NAME_REQUIRED'
            );
        }

        const existingGroup = await groupRepository.getGroupByName(
            groupData.name
        );
        if (existingGroup) {
            throw createHttpError(
                409,
                'El nombre del grupo ya está en uso',
                'GROUP_NAME_ALREADY_IN_USE'
            );
        }

        let code = generateRandomCode();
        const existingCode = await groupRepository.getGroupByCode(code);
        while (existingCode) {
            code = generateRandomCode();
            throw createHttpError(
                409,
                'El código generado para el grupo ya está en uso',
                'GROUP_CODE_CONFLICT'
            );
        }

        return groupRepository.createGroup({
            name: groupData.name,
            admin: userData.userId,
            code,
            members: userData.userId
        });
    };

    const updateGroup = async (id, groupData, authenticatedUserId) => {
        const existingGroup = await groupRepository.getGroupyId(id);
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

        return groupRepository.updateGroup(id, { name: groupData.name });
    };

    const deleteGroup = async (id, authenticatedUserId) => {
        const existingGroup = await groupRepository.getGroupyId(id);
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

        return groupRepository.deleteGroup(id);
    };

    const addMemberToGroup = async (groupCode, userNick, requesterId) => {
        const group = await groupRepository.getGroupByCode(groupCode);
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

        const user = await userRepository.getUserByNickName(userNick);
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

        group.members.push(user._id);
        await group.save();

        return {
            message: 'Usuario agregado al grupo exitosamente',
            group
        };
    };

    return {
        addMemberToGroup,
        createGroup,
        deleteGroup,
        getAllGroups,
        getGroupById,
        getGroupsForUser,
        updateGroup
    };
};

module.exports = { createGroupService };
