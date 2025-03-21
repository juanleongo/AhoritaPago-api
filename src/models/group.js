const {Schema,model  }=require('mongoose')

const GroupSchema = Schema({
    name : {
        type: String,
        required: [true, 'el nombre es obligatorio'],
        unique: true
    }, state:{
        type:Boolean,
        default:true
    },admin:{
        type: Schema.Types.ObjectId,
        ref : 'User',
        required: true
    },members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
})

module.exports = model('Group',GroupSchema)