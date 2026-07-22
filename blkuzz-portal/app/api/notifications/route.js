import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Notification from '@/models/Notification'
import '@/models/Project'

const cdn    = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3Base = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3Base)) ? raw.replace(s3Base, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3Base}/${raw}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const notifications = await Notification.find({ user: session.user.id })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('from', 'username avatar profileImage')
    .populate('project', 'title slug')
    .lean()

  const mapped = notifications.map(n => ({
    ...n,
    from: n.from ? {
      ...n.from,
      avatarUrl: toUrl(n.from.avatar?.url || (typeof n.from.avatar === 'string' ? n.from.avatar : null) || n.from.profileImage || null),
    } : n.from,
  }))

  const unread = mapped.filter(n => !n.read).length
  return NextResponse.json({ unread, notifications: mapped })
}

export async function PATCH() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  await Notification.updateMany({ user: session.user.id, read: false }, { read: true })
  return NextResponse.json({ ok: true })
}
