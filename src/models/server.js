const express = require('express');
const cors = require('cors');
const { connection } = require('../db/config');




class Server {
     
    constructor() {
       this.app = express()
       this.port = process.env.PORT 
       this.paths = {
       
       }
      

        //conecta la base de datos
        this.conectarDB()

        this.middleware()

        //rutas de la aplicación
        this.routes()

    }
    async conectarDB() {
        await connection();
    }

    middleware() {
        //habilitar cors
        this.app.use(cors())

        //parseo y formato del body 
        this.app.use(express.json())

        //servir contenido en el front
       
        
        //cargar archivos
        
        
    }

    routes() {
        
        
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`Example app listening on port ${this.port }!`)
            
        })
    }
}

module.exports = Server