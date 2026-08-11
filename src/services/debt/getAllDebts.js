const createGetAllDebts = ({ debtRepository }) => {
    const getAllDebts = async userId => (
        debtRepository.getAllDebtsForUser(userId)
    );

    return getAllDebts;
};

module.exports = { createGetAllDebts };
