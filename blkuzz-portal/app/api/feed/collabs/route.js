import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import '@/models/Signup'

const cdn   = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3    = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3)) ? raw.replace(s3, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3}/${raw}`
}

function avatarFor(u) {
  if (!u) return null
  const raw = u.avatar?.url || (typeof u.avatar === 'string' ? u.avatar : null) || u.profileImage
  return toUrl(raw)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const fields = 'username avatar profileImage'
  const projects = await Project.find({ 'collaborators.0': { $exists: true } })
    .sort({ updatedAt: -1 })
    .limit(20)
    .populate('creator', fields)
    .populate('collaborators.user', fields)
    .lean()

  const out = projects.map(p => {
    const members = [
      { username: p.creator?.username, avatar: avatarFor(p.creator) },
      ...(p.collaborators ?? []).map(c => ({ username: c.user?.username, avatar: avatarFor(c.user) })),
    ].filter(m => m.username)

    return {
      _id:     p._id,
      title:   p.title,
      tagline: p.tagline ?? '',
      slug:    p.slug,
      members,
    }
  })

  return NextResponse.json(out)
}
