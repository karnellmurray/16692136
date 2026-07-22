import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Notification from '@/models/Notification'
import Signup from '@/models/Signup'
import mongoose from 'mongoose'

async function findProject(id) {
  const bySlug = await Project.findOne({ slug: id })
  if (bySlug) return bySlug
  if (mongoose.isValidObjectId(id)) return Project.findById(id)
  return null
}

// GET — list pending invites for this project (owner only)
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const project = await findProject(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.creator.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cdn   = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
  const s3    = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`
  const toUrl = raw => {
    if (!raw) return null
    if (raw.startsWith('http')) return (cdn && raw.startsWith(s3)) ? raw.replace(s3, cdn) : raw
    return cdn ? `${cdn}/${raw}` : `${s3}/${raw}`
  }

  const invites = await Notification.find({
    type: 'collab_invite',
    project: project._id,
    status: 'pending',
  }).populate('user', 'username avatar profileImage').lean()

  const out = invites.map(n => ({
    ...n,
    user: n.user ? {
      ...n.user,
      profileImage: toUrl(n.user.profileImage),
      avatar: n.user.avatar ? { ...n.user.avatar, url: toUrl(n.user.avatar?.url || (typeof n.user.avatar === 'string' ? n.user.avatar : null)) } : n.user.avatar,
    } : n.user,
  }))

  return NextResponse.json(out)
}

// POST — send a collab invite to a user
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const project = await findProject(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.creator.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, role } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const alreadyCollab = project.collaborators.some(c => c.user?.toString() === userId)
  if (alreadyCollab) return NextResponse.json({ error: 'Already a collaborator' }, { status: 409 })

  const existing = await Notification.findOne({
    type: 'collab_invite',
    project: project._id,
    user: userId,
    status: 'pending',
  })
  if (existing) return NextResponse.json({ error: 'Invite already sent' }, { status: 409 })

  const inviter = await Signup.findById(session.user.id, 'username').lean()

  const notif = await Notification.create({
    user:    userId,
    type:    'collab_invite',
    from:    session.user.id,
    project: project._id,
    role:    role || '',
    text:    `@${inviter?.username ?? 'someone'} invited you to collaborate on "${project.title}"${role ? ` as ${role}` : ''}`,
    link:    `/home/projects/${project.slug}`,
    status:  'pending',
    read:    false,
  })

  return NextResponse.json({ ok: true, notifId: notif._id })
}
