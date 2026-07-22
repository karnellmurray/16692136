import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import ProjectPost from '@/models/ProjectPost'
import ProjectComment from '@/models/ProjectComment'

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const comment = await ProjectComment.findById(params.commentId)
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.author.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await comment.deleteOne()
  await ProjectPost.findByIdAndUpdate(params.postId, { $inc: { commentCount: -1 } })

  return NextResponse.json({ ok: true })
}
