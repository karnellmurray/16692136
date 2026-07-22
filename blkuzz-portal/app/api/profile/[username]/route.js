import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import Project from '@/models/Project'
import ProjectPost from '@/models/ProjectPost'
import BulletinPost from '@/models/BulletinPost'
import '@/models/Block'
import { isBlocked } from '@/lib/blockCheck'

const cdn    = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3Base = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3Base)) ? raw.replace(s3Base, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3Base}/${raw}`
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = params
  await connectDB()

  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const user = await Signup.findOne({ username: { $regex: new RegExp(`^${escaped}$`, 'i') } }, '-passwordHash').lean()
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const userId = user._id

  const projects = await Project.find({ creator: userId, slug: { $exists: true } })
    .sort({ updatedAt: -1 })
    .lean()

  const collabProjects = await Project.find({
    'collaborators.user': userId,
    creator: { $ne: userId },
    slug: { $exists: true },
  })
    .populate('creator', 'username name avatar profileImage')
    .sort({ updatedAt: -1 })
    .lean()

  let callouts = 0
  try {
    callouts = await BulletinPost.countDocuments({ author: userId })
  } catch {}

  let mediaPosts = []
  try {
    mediaPosts = await ProjectPost.find({ author: userId, media: { $exists: true, $not: { $size: 0 } } })
      .populate('project', 'title slug')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()
  } catch {}

  let activity = []
  try {
    activity = await ProjectPost.find({ author: userId })
      .populate('project', 'title slug')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
  } catch {}

  const avatarUrl = toUrl(
    user.avatar?.url ||
    (typeof user.avatar === 'string' ? user.avatar : null) ||
    user.profileImage || null
  )

  return NextResponse.json({
    user: { ...user, avatarUrl },
    projects,
    collabs: collabProjects.map(p => ({
      _id:        p._id,
      title:      p.title,
      slug:       p.slug,
      status:     p.status,
      disciplines: p.disciplines,
      creator: {
      ...p.creator,
      avatarUrl: toUrl(p.creator?.avatar?.url || (typeof p.creator?.avatar === 'string' ? p.creator.avatar : null) || p.creator?.profileImage || null),
    },
      role:       p.collaborators?.find(c => c.user?.toString() === userId.toString())?.role ?? '',
      updatedAt:  p.updatedAt,
    })),
    stats: {
      followers: user.followers?.length ?? 0,
      projects:  projects.length,
      callouts,
      collabs:   collabProjects.length,
    },
    media:          mediaPosts,
    activity,
    isOwnProfile:   session.user.id === userId.toString(),
    isFollowing:    (user.followers ?? []).some(f => f.toString() === session.user.id),
    isBlocked:      session.user.id !== userId.toString() ? await isBlocked(session.user.id, userId.toString()) : false,
  })
}
