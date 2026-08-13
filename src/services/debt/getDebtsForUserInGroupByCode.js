const { createHttpError } = require('../../helpers/httpError');
const { PAGINATION } = require('../../config/pagination');
const { createPaginationMetadata } = require('../../helpers/pagination');

const createGetDebtsForUserInGroupByCode = ({
    debtRepository,
    groupRepository
}) => {
    const getDebtsForUserInGroupByCode = async (
        userId,
        groupCode,
        pagination = {}
    ) => {
        const group = await groupRepository.findActiveByCode(groupCode);

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

        const page = pagination.page ?? PAGINATION.defaultPage;
        const limit = pagination.limit ?? PAGINATION.defaultLimit;
        const [debts, count] = await Promise.all([
            debtRepository.findActiveByParticipantAndGroup(
                userId,
                group._id,
                { page, limit }
            ),
            debtRepository.countActiveByParticipantAndGroup(
                userId,
                group._id
            )
        ]);

        return {
            count,
            pagination: createPaginationMetadata(count, page, limit),
            debts
        };
    };

    return getDebtsForUserInGroupByCode;
};

module.exports = { createGetDebtsForUserInGroupByCode };
