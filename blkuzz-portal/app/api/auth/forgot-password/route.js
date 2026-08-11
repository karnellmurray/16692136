import { NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import { sendPasswordResetEmail } from '@/lib/resend'

const GENERIC_MESSAGE = 'If an account exists for that email, a reset link has been sent.'

export async function POST(req) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

  await connectDB()
  const user = await Signup.findOne({ email: email.trim().toLowerCase() })

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

  return NextResponse.json({ message: GENERIC_MESSAGE })
}
