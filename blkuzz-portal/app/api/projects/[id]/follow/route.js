import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import mongoose from 'mongoose'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const project = await Project.findOne({ slug: params.id })
    ?? (mongoose.isValidObjectId(params.id) ? await Project.findById(params.id) : null)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (project.creator.toString() === session.user.id) {
    return NextResponse.json({ error: 'Cannot follow your own project' }, { status: 403 })
  }

  const uid = new mongoose.Types.ObjectId(session.user.id)
  const idx = project.followers.findIndex(f => f.equals(uid))
  let following

  if (idx === -1) {
    project.followers.push(uid)
    project.followerCount = Math.max(0, project.followerCount + 1)
    following = true
  } else {
    project.followers.splice(idx, 1)
    project.followerCount = Math.max(0, project.followerCount - 1)
    following = false
  }

  await project.save()
  return NextResponse.json({ following, count: project.followerCount })
}
