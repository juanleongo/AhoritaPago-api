const express = require('express');
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
       this.httpSecurityConfig = (
        this.compositionRoot.infrastructure.httpSecurityConfig
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
        const {
            cors,
            globalRateLimiter,
            helmet
        } = this.compositionRoot.middleware;

        if (
            this.httpSecurityConfig.rateLimitEnabled
            && this.httpSecurityConfig.trustProxyHops > 0
        ) {
            this.app.set(
                'trust proxy',
                this.httpSecurityConfig.trustProxyHops
            )
        }

        this.app.use(helmet)
        this.app.use(cors)

        if (globalRateLimiter) {
            this.app.use(globalRateLimiter)
        }

        //parseo y formato del body
        this.app.use(express.json({
            limit: this.httpSecurityConfig.jsonBodyLimit
        }))
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
