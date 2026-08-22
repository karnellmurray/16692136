const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { loadEnvConfig } = require('@next/env')

loadEnvConfig(__dirname)

const dev  = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3002', 10)
const app  = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      await handle(req, res, parse(req.url, true))
    } catch (err) {
      console.error('Admin server error:', err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, () => {
    console.log(`> Blkuzz Admin ready on http://localhost:${port}/bz-admin`)
  })
})
