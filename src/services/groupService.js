const groupRepository = require('../repositories/group');

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

    const data = {
        name: groupData.name,
        admin: userData.userId
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

const addMemberToGroup = async (groupId, userId, adminId) => {
    try {
        // 1️⃣ Buscar el grupo por ID
        const group = await groupRepository.getGroupyId(groupId);
        
        if (!group) {
            throw new Error('El grupo no existe');
        }

        // 2️⃣ Verificar si el usuario que agrega es el ADMIN del grupo
        if (group.admin.toString() !== adminId) {
            throw new Error('Solo el administrador del grupo puede agregar miembros');
        }

        // 3️⃣ Verificar si el usuario ya es miembro
        if (!userId){
            throw new Error('debe ingresar un usuario'); 
        }

        if (group.members.includes(userId)) {
           
            throw new Error('El usuario ya es miembro del grupo');
        }

        // 4️⃣ Agregar el usuario a la lista de miembros
        group.members.push(userId);

        // 5️⃣ Guardar los cambios
        await group.save();

        return { message: 'Usuario agregado al grupo exitosamente', group };
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { addMemberToGroup, getAllGroups, getGroupById, createGroup, updateGroup, deleteGroup };
