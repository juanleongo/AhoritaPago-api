const groupRepository = require('../repositories/group');
const userRepository = require('../repositories/user');
const {generateRandomCode}= require('../helpers/codeGenerator')

const getAllGroups = async () => {
    return await groupRepository.getAllGroup();
};

const getGroupById = async (id) => {
    const group = await groupRepository.getGroupyId(id);
    if (!group) {
        throw new Error('Grupo no encontrado');
    }
    return group;
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

const updateGroup = async (id, groupData) => {
    const existingGroup = await groupRepository.getGroupyId(id);
    if (!existingGroup) {
        throw new Error('Grupo no encontrado');
    }
    return await groupRepository.updateGroup(id, groupData);
};

const deleteGroup = async (id) => {
    const existingGroup = await groupRepository.getGroupyId(id);
    if (!existingGroup) {
        throw new Error('Grupo no encontrado');
    }
    return await groupRepository.deleteGroup(id);
};

const addMemberToGroup = async (groupCode, userNick, adminId) => {
    try {
        // Buscar el grupo por code
        const group = await groupRepository.getGroupByCode(groupCode);
        const user = await userRepository.getUserByNickName(userNick)
        
        
        if (!group) {
            throw new Error('El grupo no existe');
        }

        // Verificar si el usuario que agrega es el ADMIN del grupo
        if (group.admin.toString() !== adminId) {
            throw new Error('Solo el administrador del grupo puede agregar miembros');
        }

        // Verificar si el usuario ya es miembro
        if (!user._id){
            throw new Error('debe ingresar un usuario'); 
        }

        if (group.members.includes(user._id)) {
        
            throw new Error('El usuario ya es miembro del grupo');
        }

        //  Agregar el usuario a la lista de miembros
        group.members.push(user._id);
        await group.save();

        return { message: 'Usuario agregado al grupo exitosamente', group };
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { addMemberToGroup, getAllGroups, getGroupById, createGroup, updateGroup, deleteGroup };
