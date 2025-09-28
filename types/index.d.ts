// Type definitions for @hoajs/adapter
// Project: https://github.com/hoa-js/adapter
// Definitions by: nswbmw

import type { Hoa } from 'hoa'
import type { Server } from 'http'

/**
 * Options for the Node.js server adapter
 */
export interface NodeServerOptions {
  [key: string]: any
}

/**
 * Node.js Server Adapter Extension
 * Adds HTTP server capabilities to Hoa applications using Node.js built-in http module
 */
export declare function nodeServer(options?: NodeServerOptions): (app: Hoa) => void

/**
 * Module augmentation: extend Hoa with listen method
 */
declare module 'hoa' {
  interface Hoa {
    /**
     * Start the HTTP server and listen on the specified port
     * @param port - Port number to listen on
     * @param hostname - Hostname to bind to (optional)
     * @param backlog - Maximum length of the queue of pending connections (optional)
     * @param callback - Callback function called when server starts listening (optional)
     * @returns The HTTP server instance
     */
    listen(port?: number, hostname?: string, backlog?: number, callback?: () => void): Server
    listen(port?: number, hostname?: string, callback?: () => void): Server
    listen(port?: number, callback?: () => void): Server
    listen(callback?: () => void): Server
    listen(...args: any[]): Server
  }
}
