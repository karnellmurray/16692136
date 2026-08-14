import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import GroupMessage from '@/models/GroupMessage'
import '@/models/Project'
import '@/models/Block'
import { getBlockedIds } from '@/lib/blockCheck'

const cdn    = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3Base = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`
function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3Base)) ? raw.replace(s3Base, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3Base}/${raw}`
}

function normaliseSender(sender) {
  if (!sender) return sender
  return {
    ...sender,
    avatarUrl: toUrl(sender.avatar?.url || (typeof sender.avatar === 'string' ? sender.avatar : null) || sender.profileImage || null),
  }
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url  = new URL(req.url)
  const room = url.searchParams.get('room') || 'lobby'

  await connectDB()

  const blockedIds = await getBlockedIds(session.user.id)

  // Include legacy messages (no room field) in lobby
  const query = room === 'lobby'
    ? { $or: [{ room: 'lobby' }, { room: { $exists: false } }, { room: null }] }
    : { room }
  if (blockedIds.length) query.sender = { $nin: blockedIds }

  const messages = await GroupMessage.find(query)
    .populate('sender', 'username name avatar profileImage discipline')
    .populate('projectRef', 'title slug coverImage')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()

  const out = messages.reverse().map(m => ({
    ...m,
    sender:     normaliseSender(m.sender),
    projectRef: m.projectRef ? {
      ...m.projectRef,
      coverImage: toUrl(m.projectRef.coverImage),
    } : null,
  }))

  return NextResponse.json(out)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, room = 'lobby', projectRef } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const safeRoom = (room?.trim().toLowerCase()) || 'lobby'

  await connectDB()

  const msg = await GroupMessage.create({
    sender:     session.user.id,
    content:    content.trim(),
    room:       safeRoom,
    msgType:    'message',
    projectRef: projectRef || null,
  })

  await msg.populate('projectRef', 'title slug coverImage')

  const payload = {
    _id:        msg._id,
    content:    msg.content,
    room:       msg.room,
    msgType:    msg.msgType,
    createdAt:  msg.createdAt,
    projectRef: msg.projectRef ? {
      _id:        msg.projectRef._id,
      title:      msg.projectRef.title,
      slug:       msg.projectRef.slug,
      coverImage: toUrl(msg.projectRef.coverImage),
    } : null,
    sender: {
      _id:       session.user.id,
      username:  session.user.username,
      avatarUrl: null, // client already knows their own avatar
    },
  }

  if (global.io) global.io.emit('group-message', payload)

  return NextResponse.json(payload, { status: 201 })
}
