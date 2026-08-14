import { NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import { sendPasswordResetEmail } from '@/lib/resend'
import { isRateLimited, recordAttempt } from '@/lib/rateLimit'

const GENERIC_MESSAGE = 'If an account exists for that email, a reset link has been sent.'
const RATE_LIMIT_MAX      = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
// Floor the total response time so whether the email exists (extra DB
// write + external email API call) or not isn't distinguishable by timing.
const MIN_RESPONSE_MS = 1000

export async function POST(req) {
  const start = Date.now()
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

  const normalisedEmail = email.trim().toLowerCase()
  const rateLimitKey     = `reset:${normalisedEmail}`

  await connectDB()

  if (await isRateLimited(rateLimitKey, { max: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS })) {
    // Still generic + timing-floored, so this itself doesn't confirm the account exists.
    await equalizeTiming(start)
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }
  await recordAttempt(rateLimitKey)

  const user = await Signup.findOne({ email: normalisedEmail })

  if (user) {
    const token       = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    await Signup.findByIdAndUpdate(user._id, {
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
    })

    const baseUrl  = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    try {
      await sendPasswordResetEmail(user.email, resetUrl)
    } catch (err) {
      console.error('Failed to send password reset email:', err)
    }
  }

  await equalizeTiming(start)
  return NextResponse.json({ message: GENERIC_MESSAGE })
}

async function equalizeTiming(start) {
  const elapsed = Date.now() - start
  if (elapsed < MIN_RESPONSE_MS) await new Promise(r => setTimeout(r, MIN_RESPONSE_MS - elapsed))
}
