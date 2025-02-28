const { Schema,model}= require('mongoose')

const UserSchema = Schema({
    name:{
        type:String,
        required: [true,'no envio el nombre']
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
    
    rol:{
        type:String,
        emun:['admin', 'member']
    },
    state:{
        type:Boolean,
        default:true
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