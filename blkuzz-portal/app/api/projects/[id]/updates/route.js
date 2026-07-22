import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Post from '@/models/Post'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, type = 'update', images = [] } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  await connectDB()
  const project = await Project.findById(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.author.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  project.updates.push({ content: content.trim(), type, images })
  await project.save()

  await Post.create({ project: project._id, author: session.user.id, content: content.trim() })

  const update = project.updates[project.updates.length - 1]
  return NextResponse.json(update, { status: 201 })
}
