const moongoose = require('mongoose')

const connection= async () =>  {
    
    try {
        await moongoose.connect('mongodb+srv://leon:leon_200311@cluster0.cjed3bv.mongodb.net/AhoritaPago', {
            
           
        })
        console.log('DB Connected')
        
    } catch (error) {
        console.log(error)
        throw new Error(error)
        
    }
}

module.exports = {
    connection
}