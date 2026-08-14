require('dotenv').config({ override: true })

const express   = require('express')
const mongoose  = require('mongoose')
const helmet    = require('helmet')
const cors      = require('cors')
const rateLimit = require('express-rate-limit')
const webRoutes = require('./routes/web')

const app  = express()
const PORT = process.env.PORT || 3000

// Render sits behind a single reverse proxy that sets X-Forwarded-For;
// trust exactly that one hop so express-rate-limit sees the real client
// IP instead of the proxy's.
app.set('trust proxy', 1)

// Security headers — relax CSP to allow Google Fonts and inline styles/scripts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc:  ["'self'"],
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

const allowedOrigins    = [process.env.CORS_ORIGIN, 'http://localhost:3002'].filter(Boolean)
const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.karnellmurrays-projects\.vercel\.app$/

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
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

// Tighter, dedicated limit on OTP sending specifically -- this is the one
// endpoint that costs real money (Twilio SMS) per call, so the generic
// 100/15min budget alone would let one IP trigger sends to ~100 different
// phone numbers before the general limiter even engages.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many verification code requests. Please wait before trying again.' }
})

app.use('/web/api/verify/send', otpLimiter)
app.use('/web/api', apiLimiter)
app.use('/web/api', webRoutes)

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'blkuzz-api' })
})

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
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