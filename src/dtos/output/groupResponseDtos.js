const {
    compactObject,
    createReferenceDto,
    toId,
    toPlainObject
} = require('./resourceDto');

const groupResponseDto = group => {
    const source = toPlainObject(group);

    return compactObject({
        id: toId(source),
        name: source.name,
        state: source.state,
        code: source.code,
        admin: createReferenceDto(source.admin, ['name', 'nickname']),
        members: Array.isArray(source.members)
            ? source.members.map(member => createReferenceDto(
                member,
                ['name', 'nickname']
            ))
            : []
    });
};

module.exports = { groupResponseDto };
