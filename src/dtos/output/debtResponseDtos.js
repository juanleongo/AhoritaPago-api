const {
    compactObject,
    createReferenceDto,
    toId,
    toPlainObject
} = require('./resourceDto');
const { toCopNumber } = require('../../helpers/copMoney');

const optionalCopNumber = value => (
    value === undefined || value === null
        ? undefined
        : toCopNumber(value)
);

const debtResponseDto = debt => {
    const source = toPlainObject(debt);

    return compactObject({
        id: toId(source),
        description: source.description,
        state: source.state,
        creditor: createReferenceDto(
            source.creditor,
            ['name', 'nickname']
        ),
        debtor: Array.isArray(source.debtor)
            ? source.debtor.map(user => createReferenceDto(
                user,
                ['name', 'nickname']
            ))
            : [],
        value: optionalCopNumber(source.value),
        group: createReferenceDto(source.group, ['name', 'code']),
        debtDate: source.debtDate,
        paymentDate: source.paymentDate
    });
};

const debtSummaryItemDto = item => compactObject({
    description: item.description,
    group: item.group,
    date: item.date,
    amount: optionalCopNumber(item.amount),
    with: item.with
});

const debtSummaryDto = summary => ({
    debts: (summary?.debts || []).map(debtSummaryItemDto),
    credits: (summary?.credits || []).map(debtSummaryItemDto)
});

module.exports = {
    debtResponseDto,
    debtSummaryDto
};
