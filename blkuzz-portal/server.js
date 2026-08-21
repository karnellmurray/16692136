const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { loadEnvConfig } = require('@next/env')

loadEnvConfig(__dirname)

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3001', 10)

const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    // Let Socket.io's own listener (registered below) claim its own path
    // explicitly, rather than relying on it winning the race against
    // Next's async 404 handling for a route it doesn't recognize.
    if (req.url.startsWith('/socket.io')) return

    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error:', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer)
  global.io = io

  io.on('connection', socket => {
    // Join personal room so we can target DMs
    socket.on('join', userId => {
      socket.join(`user:${userId}`)
    })

    // Group chat — broadcast to everyone
    socket.on('group-message', msg => {
      io.emit('group-message', msg)
    })

    // DM — deliver to recipient's personal room
    socket.on('direct-message', ({ to, msg }) => {
      io.to(`user:${to}`).emit('direct-message', msg)
    })
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
