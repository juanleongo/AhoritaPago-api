const { afterEach, test } = require('node:test')
const assert = require('node:assert/strict')

const configPath = require.resolve('../../src/db/config')
const serverPath = require.resolve('../../src/models/server')
const originalConfig = require(configPath)

const loadServerWithConnection = (connection) => {
    require.cache[configPath].exports = { connection }
    delete require.cache[serverPath]
    return require(serverPath)
}

afterEach(() => {
    require.cache[configPath].exports = originalConfig
    delete require.cache[serverPath]
})

test('espera la conexión a MongoDB antes de abrir el puerto', async () => {
    const events = []
    let releaseConnection

    const connection = async () => {
        events.push('connection:start')
        await new Promise((resolve) => {
            releaseConnection = resolve
        })
        events.push('connection:end')
    }

    const Server = loadServerWithConnection(connection)
    const server = new Server()

    server.app.listen = (port, callback) => {
        events.push(`listen:${port}`)
        callback()
        return { close: () => {} }
    }

    const startPromise = server.start()
    await new Promise((resolve) => setImmediate(resolve))

    assert.deepEqual(events, ['connection:start'])

    releaseConnection()
    await startPromise

    assert.deepEqual(events, [
        'connection:start',
        'connection:end',
        `listen:${server.port}`
    ])
})

test('no abre el puerto cuando falla la conexión a MongoDB', async () => {
    const connectionError = new Error('MongoDB no disponible')
    const Server = loadServerWithConnection(async () => {
        throw connectionError
    })
    const server = new Server()
    let listenWasCalled = false

    server.app.listen = () => {
        listenWasCalled = true
    }

    await assert.rejects(server.start(), connectionError)
    assert.equal(listenWasCalled, false)
})

test('registra los manejadores de errores después de todas las rutas', () => {
    const Server = loadServerWithConnection(async () => {})
    const server = new Server()
    const middlewareNames = server.app._router.stack.map(layer => layer.name)

    assert.deepEqual(
        middlewareNames.slice(-2),
        ['notFoundHandler', 'errorHandler']
    )

    const lastRouterIndex = middlewareNames.lastIndexOf('router')
    const notFoundIndex = middlewareNames.lastIndexOf('notFoundHandler')

    assert.ok(lastRouterIndex >= 0)
    assert.ok(lastRouterIndex < notFoundIndex)
})
