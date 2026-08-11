const express = require('express');
const cors = require('cors');
const { connection } = require('../db/config');
const { errorHandler, notFoundHandler } = require('../middlewares');
const { createCompositionRoot } = require('../compositionRoot');
class Server {
     
    constructor(options = {}) {
       this.app = express()
       this.port = options.port || process.env.PORT
       this.connection = options.connection || connection
       this.compositionRoot = (
        options.compositionRoot || createCompositionRoot()
       )
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
        await this.connection();
    }

    middleware() {
        //habilitar cors
        this.app.use(cors())

        //parseo y formato del body
        this.app.use(express.json())
    }

    routes() {
        this.app.use(this.paths.group, this.compositionRoot.routers.group)
        this.app.use(this.paths.user, this.compositionRoot.routers.user)
        this.app.use(this.paths.auth, this.compositionRoot.routers.auth)
        this.app.use(this.paths.payment, this.compositionRoot.routers.debt)
        
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
