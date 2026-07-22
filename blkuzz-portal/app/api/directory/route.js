import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import Project from '@/models/Project'
import '@/models/Block'
import { getBlockedIds } from '@/lib/blockCheck'

const cdn    = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3Base = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

function toUrl(raw) {
  if (!raw) return null
  // Already a full URL — swap S3 origin for CloudFront if needed
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3Base)) ? raw.replace(s3Base, cdn) : raw
  // Raw S3 key — build full URL
  return cdn ? `${cdn}/${raw}` : `${s3Base}/${raw}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const blockedIds = await getBlockedIds(session.user.id)
  const users = await Signup.find(
    { _id: { $nin: blockedIds } },
    'name username tags location bio avatar profileImage followers createdAt blkuzzId lastActiveAt isOnline'
  ).lean()

  // Project counts are best-effort — don't let this kill the response
  let countMap = {}
  try {
    const projectCounts = await Project.aggregate([
      { $match: { creator: { $exists: true, $ne: null } } },
      { $group: { _id: '$creator', count: { $sum: 1 } } },
    ])
    countMap = Object.fromEntries(
      projectCounts
        .filter(p => p._id != null)
        .map(p => [p._id.toString(), p.count])
    )
  } catch (e) {
    console.error('[directory] project count failed:', e.message)
  }

  const out = users.map(u => ({
    id:         u._id,
    blkuzzId:   u.blkuzzId ?? null,
    name:       u.name,
    username:   u.username,
    tags:       u.tags ?? [],
    location:   u.location  ?? '',
    bio:        u.bio       ?? '',
    avatar:     toUrl(u.avatar?.url || (typeof u.avatar === 'string' ? u.avatar : null) || u.profileImage || null),
    followers:   u.followers?.length ?? 0,
    projects:    countMap[u._id.toString()] ?? 0,
    createdAt:   u.createdAt,
    lastActiveAt: u.lastActiveAt ?? null,
    isOnline:     u.isOnline === true && u.lastActiveAt != null && (Date.now() - new Date(u.lastActiveAt)) < 10 * 60 * 1000,
  }))

  return NextResponse.json(out)
}
