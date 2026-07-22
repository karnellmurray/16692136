import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Empty comment' }, { status: 400 })

  await connectDB()
  const project = await Project.findById(params.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const update = project.updates.id(params.updateId)
  if (!update) return NextResponse.json({ error: 'Update not found' }, { status: 404 })

  update.comments.push({
    author:         session.user.id,
    authorUsername: session.user.username,
    content:        content.trim(),
  })

  await project.save()
  return NextResponse.json(update.comments[update.comments.length - 1], { status: 201 })
}
