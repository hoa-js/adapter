import { Readable } from 'node:stream'
import { createReadStream } from 'node:fs'
import path from 'node:path'

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

  it('supports String body', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    app.use(async (ctx) => { ctx.res.body = 'Hello, Hoa!' })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello, Hoa!')
  })

  it('supports JSON object body', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    app.use(async (ctx) => { ctx.res.body = { a: 1, b: '2' } })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    const ct = res.headers.get('content-type') || ''
    expect(ct.toLowerCase()).toContain('application/json')
    expect(await res.json()).toEqual({ a: 1, b: '2' })
  })

  it('supports Blob body', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    const blob = new Blob(['Hello, Hoa!'], { type: 'text/plain' })
    app.use(async (ctx) => { ctx.res.body = blob })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    expect(res.status).toBe(200)
    const ct = res.headers.get('content-type') || ''
    expect(ct.toLowerCase()).toContain('text/plain')
    expect(await res.text()).toBe('Hello, Hoa!')
  })

  it('supports ArrayBuffer body', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    const ab = new TextEncoder().encode('Hello, Hoa!').buffer
    app.use(async (ctx) => { ctx.res.body = ab })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    const buf = await res.arrayBuffer()
    expect(new TextDecoder().decode(buf)).toBe('Hello, Hoa!')
  })

  it('supports TypedArray body (Uint8Array)', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    const ta = new TextEncoder().encode('Hello, Hoa!')
    app.use(async (ctx) => { ctx.res.body = ta })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    const buf = await res.arrayBuffer()
    expect(new TextDecoder().decode(buf)).toBe('Hello, Hoa!')
  })

  it('supports ReadableStream body', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    const stream = new ReadableStream({
      start (controller) {
        controller.enqueue(new TextEncoder().encode('Hello, Hoa!'))
        controller.close()
      }
    })
    app.use(async (ctx) => { ctx.res.body = stream })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    expect(await res.text()).toBe('Hello, Hoa!')
  })

  it('supports FormData body', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    const fd = new FormData()
    fd.append('a', '1')
    fd.append('b', 'two')
    app.use(async (ctx) => { ctx.res.body = fd })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    const ct = res.headers.get('content-type') || ''
    expect(ct.toLowerCase()).toContain('multipart/form-data')
    const txt = await res.text()
    expect(txt.includes('name="a"')).toBe(true)
    expect(txt.includes('1')).toBe(true)
    expect(txt.includes('name="b"')).toBe(true)
    expect(txt.includes('two')).toBe(true)
  })

  it('supports URLSearchParams body', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    const usp = new URLSearchParams({ a: '1', b: '2' })
    app.use(async (ctx) => { ctx.res.body = usp })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    const ct = res.headers.get('content-type') || ''
    expect(ct.toLowerCase()).toContain('application/x-www-form-urlencoded')
    expect(await res.text()).toBe('a=1&b=2')
  })

  it('supports Response body', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    const resp = new Response('response body', {
      status: 201,
      headers: { 'content-type': 'text/plain', 'X-Foo': 'foo' },
    })
    app.use(async (ctx) => { ctx.res.body = resp })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}/`)
    expect(res.status).toBe(201)
    expect(res.headers.get('x-foo')).toBe('foo')
    expect(await res.text()).toBe('response body')
  })

  it('supports null body (empty response)', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    app.use(async (ctx) => { ctx.res.body = null })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    expect([200, 204]).toContain(res.status)
    expect((await res.text()).length).toBe(0)
  })

  it('supports undefined body (empty response)', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    app.use(async (ctx) => { ctx.res.body = undefined })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    expect([200, 204]).toContain(res.status)
    expect((await res.text()).length).toBe(0)
  })

  it('supports TypedArray body from Node.js Buffer', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    app.use(async (ctx) => {
      ctx.res.body = Buffer.from('Hello, Hoa!')
    })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    expect(await res.text()).toBe('Hello, Hoa!')
  })

  it('supports ArrayBuffer body from Node.js Buffer', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    app.use(async (ctx) => {
      const buf = Buffer.from('Hello, Hoa!')
      ctx.res.body = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    expect(await res.text()).toBe('Hello, Hoa!')
  })

  it('supports ReadableStream from Node.js Readable via toWeb', async () => {
    const app = new Hoa()
    app.extend(nodeServer())
    app.use(async (ctx) => {
      const nodeStream = createReadStream(path.join(process.cwd(), '__test__', 'demo.txt'), { encoding: 'utf8' })
      ctx.res.body = Readable.toWeb(nodeStream)
    })
    const server = await startServer(app, 0, 'localhost')
    servers.push(server)
    const port = server.address().port
    const res = await fetch(`http://localhost:${port}`)
    expect(await res.text()).toBe('Hello, Hoa!')
  })
})
