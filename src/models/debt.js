const {Schema,model  }=require('mongoose')

const DebtSchema = Schema({
    description: {
        type: String,
        required: [true, 'la descripcion es obligatorio']
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
    },
   value: {
    type: Number,
    required: [true, 'El valor de la deuda es obligatorio'],
    min: 0
  },
  group: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
})

module.exports = model('Debt',DebtSchema)