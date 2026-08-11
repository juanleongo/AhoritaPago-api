const createGetAllDebts = ({ debtRepository }) => {
    const getAllDebts = async userId => (
        debtRepository.findActiveByDebtor(userId)
    );

    return getAllDebts;
};

module.exports = { createGetAllDebts };
