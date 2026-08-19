import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import ProjectPost from '@/models/ProjectPost'
import Notification from '@/models/Notification'
import mongoose from 'mongoose'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const post = await ProjectPost.findById(params.postId)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const uid = new mongoose.Types.ObjectId(session.user.id)
  const idx = post.likes.findIndex(id => id.equals(uid))
  let liked

  if (idx === -1) {
    post.likes.push(uid)
    post.likeCount = Math.max(0, post.likeCount + 1)
    liked = true
  } else {
    post.likes.splice(idx, 1)
    post.likeCount = Math.max(0, post.likeCount - 1)
    liked = false
  }

  await post.save()

  if (liked && post.author.toString() !== session.user.id) {
    await Notification.create({
      user:    post.author,
      type:    'like',
      from:    session.user.id,
      project: post.project,
      text:    `@${session.user.username} liked your post`,
      link:    `/home/projects/${params.id}`,
      read:    false,
    })
  }

  return NextResponse.json({ liked, count: post.likeCount })
}
