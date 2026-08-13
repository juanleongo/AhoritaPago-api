const {
    compactObject,
    toId,
    toPlainObject
} = require('./resourceDto');

const userSummaryDto = user => {
    const source = toPlainObject(user);

    return compactObject({
        id: toId(source),
        name: source.name,
        nickname: source.nickname
    });
};

const userResponseDto = user => {
    const source = toPlainObject(user);

    return compactObject({
        id: toId(source),
        name: source.name,
        nickname: source.nickname,
        email: source.email,
        state: source.state,
        owe: source.owe,
        owes: source.owes
    });
};

module.exports = {
    userResponseDto,
    userSummaryDto
};
