import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Message from '@/models/Message'
import Notification from '@/models/Notification'
import '@/models/Block'
import { isBlocked } from '@/lib/blockCheck'
import mongoose from 'mongoose'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const me = session.user.id
  const other = params.userId

  if (await isBlocked(me, other)) return NextResponse.json([], { status: 200 })

  // Mark received messages as read
  await Message.updateMany(
    { sender: other, recipient: me, read: false },
    { read: true }
  )

  const messages = await Message.find({
    $or: [
      { sender: me, recipient: other },
      { sender: other, recipient: me },
    ]
  }).sort({ createdAt: 1 }).lean()

  return NextResponse.json(messages)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const me = session.user.id
  const other = params.userId

  await Message.deleteMany({
    $or: [
      { sender: me, recipient: other },
      { sender: other, recipient: me },
    ]
  })

  return NextResponse.json({ ok: true })
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, media } = await req.json()
  const mediaUrls = Array.isArray(media) ? media.filter(Boolean) : []
  if (!content?.trim() && !mediaUrls.length) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  await connectDB()
  if (await isBlocked(session.user.id, params.userId)) {
    return NextResponse.json({ error: 'Blocked' }, { status: 403 })
  }

  const message = await Message.create({
    sender: session.user.id,
    recipient: params.userId,
    content: content?.trim() || '',
    media: mediaUrls,
  })

  // Notification
  await Notification.create({
    user: params.userId,
    type: 'message',
    from: session.user.id,
    text: content?.trim() ? `@${session.user.username} sent you a message` : `@${session.user.username} sent an attachment`,
    link: `/home/inbox?with=${session.user.id}`,
  })

  // Emit via Socket.io if server is running
  if (global.io) {
    global.io.to(`user:${params.userId}`).emit('direct-message', {
      ...message.toObject(),
      senderUsername: session.user.username,
    })
  }

  return NextResponse.json(message, { status: 201 })
}
