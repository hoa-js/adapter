import { createServer } from 'http'
import { createServerAdapter } from '@whatwg-node/server'

export default function nodeServer (options) {
  return function nodeServerExtension (app) {
    const serverAdapter = createServerAdapter(request => app.fetch(request))
    const httpServer = createServer(serverAdapter)

    app.listen = function listen (...listenArgs) {
      return httpServer.listen(...listenArgs)
    }
  }
}
