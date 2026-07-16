const groupRepository = require('../repositories/group');
const userRepository = require('../repositories/user');
const {generateRandomCode}= require('../helpers/codeGenerator')
const { createHttpError } = require('../helpers/httpError');

const isSameId = (firstId, secondId) => (
    firstId && secondId && firstId.toString() === secondId.toString()
);

const isGroupMember = (group, userId) => (
    group.members.some(memberId => isSameId(memberId, userId))
);

const getAllGroups = async (userId) => {
    return await groupRepository.getAllGroupsByUser(userId);
};

const getGroupById = async (id, userId) => {
    const group = await groupRepository.getGroupyId(id);
    if (!group) {
        throw createHttpError(404, 'Grupo no encontrado');
    }

    if (!isGroupMember(group, userId)) {
        throw createHttpError(403, 'No tienes permiso para consultar este grupo');
    }

    return group;
};

const getGroupsForUser = async (userId) => {
    try {
        const groups = await groupRepository.getAllGroupsByUser(userId);

        // Es una buena práctica manejar el caso en que no se encuentren grupos.
        if (!groups || groups.length === 0) {
            return {
                success: true,
                data: [],
                message: 'El usuario no pertenece a ningún grupo.'
            };
        }

        return { success: true, data: groups };

    } catch (error) {
        throw new Error( error);
        
    }
};

const createGroup = async (groupData,userData) => {
    if (!groupData.name) {
        throw new Error('El nombre del grupo es obligatorio');
    }
    const existingGroup = await groupRepository.getGroupByName(groupData.name);
    if (existingGroup) {
        throw new Error('El nombre del grupo ya está en uso');
    }
    
    let code = generateRandomCode() ;
    const existingCode = await groupRepository.getGroupByCode(code)
    while (existingCode){
        code = generateRandomCode()
        throw new Error('codigo ya esta en uso');
        
    }

    const data = {
        name: groupData.name,
        admin: userData.userId,
        code: code,
        members:userData.userId
    }
    
    return await groupRepository.createGroup(data);
};

const updateGroup = async (id, groupData, authenticatedUserId) => {
    const existingGroup = await groupRepository.getGroupyId(id);
    if (!existingGroup) {
        throw createHttpError(404, 'Grupo no encontrado');
    }

    if (!isSameId(existingGroup.admin, authenticatedUserId)) {
        throw createHttpError(403, 'Solo el administrador puede modificar el grupo');
    }

    if (!Object.prototype.hasOwnProperty.call(groupData, 'name')) {
        throw createHttpError(400, 'Solo se permite actualizar el nombre del grupo');
    }

    return await groupRepository.updateGroup(id, { name: groupData.name });
};

const deleteGroup = async (id, authenticatedUserId) => {
    const existingGroup = await groupRepository.getGroupyId(id);
    if (!existingGroup) {
        throw createHttpError(404, 'Grupo no encontrado');
    }

    if (!isSameId(existingGroup.admin, authenticatedUserId)) {
        throw createHttpError(403, 'Solo el administrador puede eliminar el grupo');
    }

    return await groupRepository.deleteGroup(id);
};

const addMemberToGroup = async (groupCode, userNick, requesterId) => {
    const group = await groupRepository.getGroupByCode(groupCode);

    if (!group) {
        throw createHttpError(404, 'El grupo no existe');
    }

    if (!isGroupMember(group, requesterId)) {
        throw createHttpError(403, 'Solo un integrante del grupo puede agregar miembros');
    }

    const user = await userRepository.getUserByNickName(userNick);

    if (!user) {
        throw createHttpError(404, 'El usuario no existe');
    }

    if (isGroupMember(group, user._id)) {
        throw createHttpError(400, 'El usuario ya es miembro del grupo');
    }

    group.members.push(user._id);
    await group.save();

    return { message: 'Usuario agregado al grupo exitosamente', group };
};

module.exports = { addMemberToGroup, getAllGroups, getGroupById, createGroup, updateGroup, deleteGroup, getGroupsForUser };
