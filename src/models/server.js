const express = require('express');
const cors = require('cors');
const { connection } = require('../db/config');
const { errorHandler, notFoundHandler } = require('../middlewares');
class Server {
     
    constructor() {
       this.app = express()
       this.port = process.env.PORT 
       this.paths = {
        auth:       '/api/auth',
        group:       '/api/group',
        payment:      '/api/payment',
        user:         '/api/user',
        transaction:  '/api/transaction',
        admin:         '/api/admin',
       
       }
      

        this.middleware()

        //rutas de la aplicación
        this.routes()

        this.errorMiddleware()

    }
    async conectarDB() {
        await connection();
    }

    middleware() {
        //habilitar cors
        this.app.use(cors())

        //parseo y formato del body
        this.app.use(express.json())
    }

    routes() {
        this.app.use( this.paths.group, require('../routes/group'))
        this.app.use(this.paths.user, require('../routes/user'))
        this.app.use(this.paths.auth, require('../routes/auth'))
        this.app.use(this.paths.payment, require('../routes/debt'))
        
    }

    errorMiddleware() {
        this.app.use(notFoundHandler)
        this.app.use(errorHandler)
    }

    async start() {
        await this.conectarDB()

        return this.app.listen(this.port, () => {
            console.log(`app listening on port ${this.port }!`)
            
        })
    }
}

module.exports = Server
