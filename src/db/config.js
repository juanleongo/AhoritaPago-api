const moongoose = require('mongoose')

const connection= async () =>  {
    
    try {
        await moongoose.connect(process.env.DATABASE_URL, {      
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