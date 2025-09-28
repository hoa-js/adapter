import { Hoa } from 'hoa'

import nodeServer from '../src/nodeServer.js'

describe('nodeServer', () => {
  let servers = []

  const startServer = (app, ...listenArgs) => new Promise((resolve, reject) => {
    const s = app.listen(...listenArgs)
    s.on('listening', () => resolve(s))
    s.on('error', reject)
  })

  afterEach(async () => {
    // Clean up all servers after each test
    await Promise.all(servers.map(server => new Promise(resolve => {
      if (server && server.listening) {
        server.close(resolve)
      } else {
        resolve()
      }
    })))
    servers = []
  })

  it('returns an extension and adds listen to Hoa app', () => {
    const app = new Hoa()
    app.extend(nodeServer())
    expect(typeof app.listen).toBe('function')
  })

  it('handles basic GET requests via Hoa', async () => {
    const app = new Hoa()
    app.extend(nodeServer())

    app.use(async (ctx, next) => {
      ctx.res.body = 'Hello, Hoa!'
    })

    const server = await startServer(app, 0, 'localhost')
    servers.push(server)

    const port = server.address().port
    const response = await fetch(`http://localhost:${port}`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Hello, Hoa!')
  })

  it('handles POST body', async () => {
    const app = new Hoa()
    app.extend(nodeServer())

    app.use(async (ctx, next) => {
      const body = await ctx.req.text()
      ctx.res.body = `Received: ${body}`
    })

    const server = await startServer(app, 0, 'localhost')
    servers.push(server)

    const port = server.address().port
    const response = await fetch(`http://localhost:${port}`, {
      method: 'POST',
      body: 'data',
      headers: { 'Content-Type': 'text/plain' }
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Received: data')
  })

  it('supports middleware chaining', async () => {
    const app = new Hoa()
    app.extend(nodeServer())

    app.use(async (ctx, next) => {
      ctx.state.step = 1
      await next()
      ctx.res.body += ', Hoa!'
    })

    app.use(async (ctx, next) => {
      ctx.state.step = 2
      ctx.res.body = `Step ${ctx.state.step}: Hello`
    })

    const server = await startServer(app, 0, 'localhost')
    servers.push(server)

    const port = server.address().port
    const response = await fetch(`http://localhost:${port}`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Step 2: Hello, Hoa!')
  })

  it('invokes listen callback once', async () => {
    const app = new Hoa()
    app.extend(nodeServer())

    app.use(async (ctx, next) => {
      ctx.res.body = 'OK'
    })

    let called = 0
    const callbackSpy = () => { called++ }
    const server = await new Promise((resolve, reject) => {
      const s = app.listen(0, 'localhost', callbackSpy)
      s.on('listening', () => resolve(s))
      s.on('error', reject)
    })
    servers.push(server)

    expect(called).toBe(1)
    expect(server.listening).toBe(true)
  })
})
