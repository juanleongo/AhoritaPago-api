const { createHttpError } = require('../../helpers/httpError');

const createGetDebtsForUserInGroupByCode = ({
    debtRepository,
    groupRepository
}) => {
    const getDebtsForUserInGroupByCode = async (userId, groupCode) => {
        const group = await groupRepository.getGroupByCode(groupCode);

        if (!group) {
            throw createHttpError(
                404,
                'El grupo con ese código no fue encontrado.',
                'GROUP_NOT_FOUND'
            );
        }

        const isMember = group.members.some(
            memberId => memberId.toString() === userId
        );

        if (!isMember) {
            throw createHttpError(
                403,
                'No eres miembro de este grupo.',
                'GROUP_ACCESS_FORBIDDEN'
            );
        }

        return debtRepository.findDebtsForUserInGroup(userId, group._id);
    };

    return getDebtsForUserInGroupByCode;
};

module.exports = { createGetDebtsForUserInGroupByCode };
