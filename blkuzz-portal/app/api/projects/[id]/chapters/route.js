import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import mongoose from 'mongoose'

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chapters } = await req.json()
  if (!Array.isArray(chapters)) return NextResponse.json({ error: 'Invalid chapters' }, { status: 400 })

  await connectDB()
  const project = await Project.findOne({ slug: params.id })
    ?? (mongoose.isValidObjectId(params.id) ? await Project.findById(params.id) : null)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.creator.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  project.chapters = chapters
  // Auto-calculate progress from chapter statuses
  const done = chapters.filter(c => c.status === 'done').length
  project.progress = chapters.length > 0 ? Math.round((done / chapters.length) * 100) : 0
  project.updatedAt = new Date()
  await project.save()

  return NextResponse.json({ chapters: project.chapters, progress: project.progress })
}
