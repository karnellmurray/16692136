require('dotenv').config({ override: true })

const express   = require('express')
const mongoose  = require('mongoose')
const helmet    = require('helmet')
const cors      = require('cors')
const rateLimit = require('express-rate-limit')
const path      = require('path')
const webRoutes = require('./routes/web')

const app  = express()
const PORT = process.env.PORT || 3000

// Security headers — relax CSP to allow Google Fonts and inline styles/scripts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc:  ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:', 'https:'],
        mediaSrc:   ["'self'", 'https:'],
        connectSrc: ["'self'"],
        frameSrc:   ["'none'"]
      }
    },
    // Allow compute-pressure so YouTube's player works inside the iframe
    permissionsPolicy: false
  })
)

app.use(
  cors({
    origin:      process.env.CORS_ORIGIN || 'http://localhost:3002',
    credentials: true
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests, please try again later.' }
})

app.use('/web/api', apiLimiter)
app.use('/web/api', webRoutes)

const frontendPath = path.join(__dirname, '..', 'Frontend')
app.use(express.static(frontendPath))

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'))
})

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blkuzz')
  .then(() => {
    console.log('MongoDB connected')
    app.listen(PORT, () => console.log(`Blkuzz server running on http://localhost:${PORT}`))
  })
  .catch(err => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })