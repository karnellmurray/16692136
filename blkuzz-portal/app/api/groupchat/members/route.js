import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'

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

  const url = new URL(req.url)
  const tag = url.searchParams.get('tag')?.trim().toLowerCase()

  await connectDB()

  // Lobby = all members; otherwise filter by tag
  const escapedTag = tag?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const query = escapedTag && escapedTag !== 'lobby'
    ? { tags: { $regex: new RegExp(`^${escapedTag}$`, 'i') } }
    : {}

  const users = await Signup.find(query)
    .select('username name discipline tags avatar profileImage')
    .sort({ username: 1 })
    .lean()

  return NextResponse.json(users.map(u => ({
    _id:       u._id,
    username:  u.username,
    name:      u.name,
    discipline: u.discipline,
    tags:      u.tags,
    avatarUrl: toUrl(u.avatar?.url || (typeof u.avatar === 'string' ? u.avatar : null) || u.profileImage || null),
  })))
}
