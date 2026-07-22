import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import GroupMessage from '@/models/GroupMessage'

const cdn    = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3Base = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`
function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3Base)) ? raw.replace(s3Base, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3Base}/${raw}`
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url  = new URL(req.url)
  const room = url.searchParams.get('room') || 'lobby'

  await connectDB()

  const since = new Date(Date.now() - 30 * 60 * 1000)

  const query = room === 'lobby'
    ? { $or: [{ room: 'lobby' }, { room: { $exists: false } }, { room: null }], createdAt: { $gte: since } }
    : { room, createdAt: { $gte: since } }

  const recent = await GroupMessage.find(query)
    .populate('sender', 'username name avatar profileImage discipline')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()

  // Deduplicate by sender id
  const seen  = new Set()
  const users = []
  for (const m of recent) {
    const id = m.sender?._id?.toString()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const s = m.sender
    users.push({
      _id:       s._id,
      username:  s.username,
      name:      s.name,
      discipline: s.discipline,
      avatarUrl: toUrl(s.avatar?.url || (typeof s.avatar === 'string' ? s.avatar : null) || s.profileImage || null),
    })
  }

  return NextResponse.json(users)
}
