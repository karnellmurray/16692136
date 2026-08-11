import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'

export async function POST(req) {
  const { token, password } = await req.json()
  if (!token || !password) return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })

  await connectDB()
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  const user = await Signup.findOne({
    resetPasswordToken:   hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  })

  if (!user) return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 })

  user.passwordHash         = await bcrypt.hash(password, 12)
  user.resetPasswordToken   = null
  user.resetPasswordExpires = null
  await user.save()

  return NextResponse.json({ message: 'Password updated successfully.' })
}
