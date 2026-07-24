
const Server= require('./src/models/server');

const server = new Server()

const startServer = async () => {
    try {
        await server.start()
    } catch (error) {
        console.error('No fue posible iniciar la aplicación:', error.message)
        process.exitCode = 1
    }
}

startServer()
