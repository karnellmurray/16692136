import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Block from '@/models/Block'
import Report from '@/models/Report'
import Signup from '@/models/Signup'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const blocks = await Block.find({ blockedBy: session.user.id })
    .populate('blocked', 'username name avatar profileImage')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json(blocks)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, report } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const myId = session.user.id
  if (userId === myId) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })

  await connectDB()

  // Upsert block (idempotent)
  await Block.updateOne(
    { blockedBy: myId, blocked: userId },
    { $setOnInsert: { blockedBy: myId, blocked: userId, createdAt: new Date() } },
    { upsert: true }
  )

  if (report) {
    await Report.create({
      reportedBy:       myId,
      reported:         userId,
      context:          'inbox',
      conversationWith: userId,
    })
  }

  // Notify the blocked user's socket to hide the conversation
  if (global.io) {
    global.io.to(`user:${userId}`).emit('conversation:hidden', { userId: myId })
  }

  return NextResponse.json({ ok: true })
}
