const {Schema,model  }=require('mongoose')

const DebtSchema = Schema({
    description: {
        type: String,
        required: [true, 'la descripcion es obligatorio'],
        unique: true
    }, state:{
        type:Boolean,
        default:true
    },creditor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false 
    },
    debtor: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false 
    }],
    debtDate: {
        type: Date,
        required: true,
        default: Date.now 
    },
    paymentDate: {
        type: Date,
        required: false 
    }
})

module.exports = model('Debt',DebtSchema)