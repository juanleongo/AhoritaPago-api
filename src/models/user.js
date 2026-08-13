const { Schema,model}= require('mongoose')
const {
    USER_IDENTITY_LIMITS,
    hasIdentityLength,
    isValidEmail,
    normalizeEmail,
    normalizeName,
    normalizeNickname
} = require('../config/userIdentity');

const UserSchema = Schema({
    name:{
        type:String,
        required: [true,'no envio el nombre'],
        set: normalizeName,
        validate: [
            value => hasIdentityLength(value, USER_IDENTITY_LIMITS.name),
            'El nombre debe tener entre 2 y 80 caracteres'
        ]
    },
    nickname: {
        type: String,
        required: [true, 'El nickname es obligatorio'],
        set: normalizeNickname,
        validate: [
            value => hasIdentityLength(
                value,
                USER_IDENTITY_LIMITS.nickname
            ),
            'El nickname debe tener entre 1 y 50 caracteres'
        ],
        unique: true 
    },
    email:{
        type:String,
        required: [true,'no envio el correo'],
        set: normalizeEmail,
        validate: [
            {
                validator: value => hasIdentityLength(
                    value,
                    USER_IDENTITY_LIMITS.email
                ),
                message: 'El correo es demasiado largo'
            },
            {
                validator: isValidEmail,
                message: 'El correo no tiene un formato válido'
            }
        ],
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
    google:{
        type:String,
        default:false
    }

})

UserSchema.index(
    { state: 1, nickname: 1, _id: 1 },
    { name: 'user_state_nickname' }
)

//sobre escribir el metodo toJSON, para mostrar solo la formacion que quiero

UserSchema.methods.toJSON = function (){
    const {_id,__v, password,...user} = this.toObject();
    
    user.uid =_id
    return user
}
module.exports = model('User', UserSchema)
