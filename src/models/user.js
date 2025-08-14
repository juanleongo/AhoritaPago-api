const { Schema,model}= require('mongoose')

const UserSchema = Schema({
    name:{
        type:String,
        required: [true,'no envio el nombre']
    },
    nickname: {
        type: String,
        required: [true, 'El nickname es obligatorio'],
        unique: true 
    },
    email:{
        type:String,
        required: [true,'no envio el correo'],
        unique: true
    },

    password :{
        type:String,
        required: [true,'no envio el password']

    },
    state:{
        type:Boolean,
        default:true
    },
    //owe = debo 
    owe:{
        type:Number,
        default:0 
    },
    // owes= me deben
    owes:{
        type:Number,
        default:0 
    },
    google:{
        type:String,
        default:false
    }

})

//sobre escribir el metodo toJSON, para mostrar solo la formacion que quiero

UserSchema.methods.toJSON = function (){
    const {_id,__v, password,...user} = this.toObject();
    
    user.uid =_id
    return user
}
module.exports = model('User', UserSchema)