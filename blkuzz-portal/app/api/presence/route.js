import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'

// Heartbeat — keep lastActiveAt fresh while user is active
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })
  await connectDB()
  await Signup.findByIdAndUpdate(session.user.id, { lastActiveAt: new Date(), isOnline: true })
  return NextResponse.json({ ok: true })
}

// Called before logout to mark offline
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })
  await connectDB()
  await Signup.findByIdAndUpdate(session.user.id, { isOnline: false, lastActiveAt: new Date() })
  return NextResponse.json({ ok: true })
}
