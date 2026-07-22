import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import Project from '@/models/Project'

const cdn = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3  = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3)) ? raw.replace(s3, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3}/${raw}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const members = await Signup.find(
    {},
    'username name discipline location createdAt avatar profileImage tags'
  ).sort({ createdAt: -1 }).limit(50).lean()

  const withProjects = await Promise.all(members.map(async m => {
    const projectCount = await Project.countDocuments({ creator: m._id })
    const rawAvatar = m.avatar?.url || (typeof m.avatar === 'string' ? m.avatar : null) || m.profileImage || null
    return { ...m, projectCount, avatarUrl: toUrl(rawAvatar) }
  }))

  return NextResponse.json(withProjects)
}
