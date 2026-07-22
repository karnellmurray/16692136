import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import ProjectPost from '@/models/ProjectPost'
import ProjectComment from '@/models/ProjectComment'
import Notification from '@/models/Notification'
import Signup from '@/models/Signup'

const cdn   = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3    = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3)) ? raw.replace(s3, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3}/${raw}`
}

function rewriteAuthor(author) {
  if (!author) return author
  const rawAvatar = author.avatar?.url || (typeof author.avatar === 'string' ? author.avatar : null)
  return {
    ...author,
    profileImage: toUrl(author.profileImage),
    avatar: author.avatar ? { ...author.avatar, url: toUrl(rawAvatar) } : author.avatar,
  }
}

function rewriteComment(c) {
  return { ...c, author: rewriteAuthor(c.author) }
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const comments = await ProjectComment.find({ post: params.postId })
    .sort({ createdAt: 1 })
    .populate('author', 'username avatar profileImage')
    .lean()

  return NextResponse.json(comments.map(rewriteComment))
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Empty comment' }, { status: 400 })

  await connectDB()
  const post = await ProjectPost.findById(params.postId)
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const comment = await ProjectComment.create({
    post:    params.postId,
    author:  session.user.id,
    content: content.trim(),
  })

  post.commentCount += 1
  await post.save()

  const populated = await comment.populate('author', 'username avatar profileImage')

  if (post.author.toString() !== session.user.id) {
    const commenter = await Signup.findById(session.user.id, 'username').lean()
    await Notification.create({
      user:    post.author,
      type:    'comment',
      from:    session.user.id,
      project: post.project,
      text:    `@${commenter?.username ?? 'someone'} commented on your post`,
      body:    content.trim().slice(0, 200),
      link:    `/home/projects/${params.id}`,
      read:    false,
    })
  }

  return NextResponse.json(rewriteComment(populated.toObject()))
}
