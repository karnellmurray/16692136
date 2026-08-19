import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import ProjectPost from '@/models/ProjectPost'
import ProjectComment from '@/models/ProjectComment'
import Notification from '@/models/Notification'
import BulletinPost from '@/models/BulletinPost'
import '@/models/Signup'
import mongoose from 'mongoose'
import { deleteOwnedUpload, deleteOwnedUploads } from '@/lib/s3Delete'

const cdn   = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3    = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3)) ? raw.replace(s3, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3}/${raw}`
}

function rewriteUser(u) {
  if (!u) return u
  const rawAvatar = u.avatar?.url || (typeof u.avatar === 'string' ? u.avatar : null)
  return {
    ...u,
    profileImage: toUrl(u.profileImage),
    avatar: u.avatar ? { ...u.avatar, url: toUrl(rawAvatar) } : u.avatar,
  }
}

async function findProject(id) {
  const fields = 'username avatar profileImage'
  const bySlug = await Project.findOne({ slug: id })
    .populate('creator', fields)
    .populate('collaborators.user', fields)
    .lean()
  if (bySlug) return {
    ...bySlug,
    creator: rewriteUser(bySlug.creator),
    collaborators: bySlug.collaborators?.map(c => ({ ...c, user: rewriteUser(c.user) })) ?? [],
  }
  if (mongoose.isValidObjectId(id)) {
    const byId = await Project.findById(id)
      .populate('creator', fields)
      .populate('collaborators.user', fields)
      .lean()
    return byId ? {
      ...byId,
      creator: rewriteUser(byId.creator),
      collaborators: byId.collaborators?.map(c => ({ ...c, user: rewriteUser(c.user) })) ?? [],
    } : null
  }
  return null
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const project = await findProject(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const project = await Project.findOne({ slug: params.id })
    ?? (mongoose.isValidObjectId(params.id) ? await Project.findById(params.id) : null)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.creator.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const prevCoverImage = project.coverImage

  const allowed = ['title', 'tagline', 'description', 'disciplines', 'tags', 'location', 'coverImage', 'coverImagePosition', 'status', 'progress', 'collaboratorsNeeded', 'collaboratorDisciplines']
  for (const key of allowed) {
    if (body[key] !== undefined) project[key] = body[key]
  }
  project.updatedAt = new Date()
  await project.save()

  if (body.coverImage !== undefined && prevCoverImage && prevCoverImage !== body.coverImage) {
    deleteOwnedUpload(prevCoverImage)
  }

  return NextResponse.json(project)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const project = await Project.findOne({ slug: params.id })
    ?? (mongoose.isValidObjectId(params.id) ? await Project.findById(params.id) : null)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.creator.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const projectId = project._id

  // Delete comments on all project posts, then the posts themselves
  const posts = await ProjectPost.find({ project: projectId }, '_id media').lean()
  if (posts.length) {
    await ProjectComment.deleteMany({ post: { $in: posts.map(p => p._id) } })
    await ProjectPost.deleteMany({ project: projectId })
  }

  // Remove notifications tied to this project
  await Notification.deleteMany({ project: projectId })

  // Detach bulletin posts that referenced this project
  await BulletinPost.updateMany({ projectRef: projectId }, { $unset: { projectRef: '' }, $set: { projectName: project.title } })

  const coverImage = project.coverImage
  await project.deleteOne()

  // Only after the full cascade above has succeeded -- an explicit, bounded
  // list of exactly the keys this project owned, never a sweep.
  const mediaKeys = posts.flatMap(p => p.media ?? [])
  if (coverImage) mediaKeys.push(coverImage)
  deleteOwnedUploads(mediaKeys)

  return NextResponse.json({ ok: true })
}
