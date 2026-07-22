import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import ProjectPost from '@/models/ProjectPost'
import mongoose from 'mongoose'

async function resolveProject(id) {
  if (mongoose.isValidObjectId(id)) {
    return Project.findOne({ $or: [{ slug: id }, { _id: id }] })
  }
  return Project.findOne({ slug: id })
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const project = await resolveProject(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const posts = await ProjectPost.find({ project: project._id })
    .sort({ createdAt: -1 })
    .populate('author', 'username')
    .lean()

  return NextResponse.json(posts)
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, content, media, chapterRef } = await req.json()
  const hasContent = content?.trim()
  const hasMedia   = Array.isArray(media) && media.length > 0
  if (!type || (!hasContent && !hasMedia)) {
    return NextResponse.json({ error: 'type and content or media are required' }, { status: 400 })
  }

  await connectDB()
  const project = await resolveProject(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.creator.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const post = await ProjectPost.create({
    project:    project._id,
    author:     session.user.id,
    type,
    content:    content?.trim() || '',
    media:      Array.isArray(media) ? media.filter(Boolean) : [],
    chapterRef: chapterRef || undefined,
  })

  // Update project activity timestamp
  project.lastPostAt = now
  project.updatedAt  = now
  await project.save()

  const populated = await post.populate('author', 'username')
  return NextResponse.json(populated, { status: 201 })
}
