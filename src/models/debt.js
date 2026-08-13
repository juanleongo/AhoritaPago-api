const { Schema, model } = require('mongoose');

const hasDebtors = debtors => (
    Array.isArray(debtors) && debtors.length > 0
);

const hasSingleDebtor = debtors => (
    !Array.isArray(debtors) || debtors.length === 1
);

const hasUniqueDebtors = debtors => {
    if (!Array.isArray(debtors) || !debtors.every(Boolean)) {
        return true;
    }

    return new Set(debtors.map(debtorId => debtorId.toString())).size
        === debtors.length;
};

const excludesCreditor = function excludesCreditor(debtors) {
    if (!this.creditor) {
        return true;
    }

    const creditorId = this.creditor.toString();
    return debtors.filter(Boolean).every(
        debtorId => debtorId.toString() !== creditorId
    );
};

const DebtSchema = new Schema({
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria'],
        trim: true
    },
    state: {
        type: Boolean,
        default: true
    },
    creditor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El acreedor es obligatorio']
    },
    debtor: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Cada deudor es obligatorio']
        }],
        validate: [
            {
                validator: hasDebtors,
                message: 'Debe existir al menos un deudor'
            },
            {
                validator: hasUniqueDebtors,
                message: 'Los deudores no pueden repetirse'
            },
            {
                validator: hasSingleDebtor,
                message: 'Cada deuda debe pertenecer a un solo deudor'
            },
            {
                validator: excludesCreditor,
                message: 'El acreedor no puede ser deudor'
            }
        ]
    },
    debtDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    paymentDate: {
        type: Date,
        required: false
    },
    value: {
        type: Number,
        required: [true, 'El valor de la deuda es obligatorio'],
        validate: {
            validator: value => Number.isFinite(value) && value > 0,
            message: 'El valor de la deuda debe ser mayor que cero'
        }
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    }
});

DebtSchema.index(
    { creditor: 1, state: 1, debtDate: -1, _id: -1 },
    { name: 'debt_creditor_state_debt_date' }
);
DebtSchema.index(
    { debtor: 1, state: 1, debtDate: -1, _id: -1 },
    { name: 'debt_debtor_state_debt_date' }
);
DebtSchema.index(
    {
        creditor: 1,
        state: 1,
        paymentDate: -1,
        debtDate: -1,
        _id: -1
    },
    { name: 'debt_creditor_state_payment_date' }
);
DebtSchema.index(
    {
        debtor: 1,
        state: 1,
        paymentDate: -1,
        debtDate: -1,
        _id: -1
    },
    { name: 'debt_debtor_state_payment_date' }
);
DebtSchema.index(
    { group: 1, state: 1, creditor: 1 },
    { name: 'debt_group_state_creditor' }
);
DebtSchema.index(
    { group: 1, state: 1, debtor: 1 },
    { name: 'debt_group_state_debtor' }
);
DebtSchema.index(
    { group: 1, state: 1, creditor: 1, debtDate: -1, _id: -1 },
    { name: 'debt_group_creditor_active_page' }
);
DebtSchema.index(
    { group: 1, state: 1, debtor: 1, debtDate: -1, _id: -1 },
    { name: 'debt_group_debtor_active_page' }
);

module.exports = model('Debt', DebtSchema);
