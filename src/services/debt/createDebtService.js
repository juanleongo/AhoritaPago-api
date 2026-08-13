const { createDebtAccess } = require('./debtAccess');
const { createCreateDebt } = require('./createDebt');
const { createDeleteDebt } = require('./deleteDebt');
const { createGetAllDebts } = require('./getAllDebts');
const { createGetDebtById } = require('./getDebtById');
const {
    createGetDebtHistoryForUser
} = require('./getDebtHistoryForUser');
const {
    createGetDebtSummaryForUser
} = require('./getDebtSummaryForUser');
const {
    createGetDebtsForUserInGroupByCode
} = require('./getDebtsForUserInGroupByCode');
const { createMarkAsPaid } = require('./markAsPaid');
const { createUpdateDebt } = require('./updateDebt');

const createDebtService = ({
    debtRepository,
    groupRepository,
    transactionManager
}) => {
    const debtAccess = createDebtAccess({ debtRepository });

    return {
        createDebt: createCreateDebt({
            debtAccess,
            debtRepository,
            groupRepository,
            transactionManager
        }),
        deleteDebt: createDeleteDebt({
            debtAccess,
            debtRepository,
            transactionManager
        }),
        getAllDebts: createGetAllDebts({ debtRepository }),
        getDebtById: createGetDebtById({ debtAccess }),
        getDebtHistoryForUser: createGetDebtHistoryForUser({
            debtRepository
        }),
        getDebtSummaryForUser: createGetDebtSummaryForUser({
            debtRepository
        }),
        getDebtsForUserInGroupByCode: (
            createGetDebtsForUserInGroupByCode({
                debtRepository,
                groupRepository
            })
        ),
        markAsPaid: createMarkAsPaid({
            debtAccess,
            debtRepository,
            transactionManager
        }),
        updateDebt: createUpdateDebt({
            debtAccess,
            debtRepository
        })
    };
};

module.exports = { createDebtService };
