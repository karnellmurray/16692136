import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import ProjectPost from '@/models/ProjectPost'
import { deleteOwnedUploads } from '@/lib/s3Delete'

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const post = await ProjectPost.findById(params.postId)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.author.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { content, media, chapterRef, type } = await req.json()
  const prevMedia = post.media ?? []

  if (content  !== undefined) post.content    = content.trim() || ''
  if (media    !== undefined) post.media      = Array.isArray(media) ? media.filter(Boolean) : []
  if (chapterRef !== undefined) post.chapterRef = chapterRef || undefined
  if (type     !== undefined) post.type       = type
  post.updatedAt = new Date()
  await post.save()

  if (media !== undefined) {
    const removed = prevMedia.filter(url => !post.media.includes(url))
    deleteOwnedUploads(removed)
  }

  const populated = await post.populate('author', 'username')
  return NextResponse.json(populated)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const post = await ProjectPost.findById(params.postId)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.author.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const media = post.media ?? []
  await post.deleteOne()
  deleteOwnedUploads(media)

  return NextResponse.json({ ok: true })
}
