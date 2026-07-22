import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import ProjectPost from '@/models/ProjectPost'
import BulletinPost from '@/models/BulletinPost'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [projectPosts, bulletins] = await Promise.all([
    ProjectPost.find()
      .populate('author', 'username _id')
      .populate('project', 'title slug disciplines followerCount')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    BulletinPost.find()
      .populate('author', 'username _id')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ])

  const feedPosts = projectPosts.map(p => ({
    _id:            p._id,
    type:           p.type ?? 'project',
    authorUsername: p.author?.username ?? 'unknown',
    authorId:       p.author?._id,
    projectId:      p.project?._id,
    projectSlug:    p.project?.slug ?? '',
    projectName:    p.project?.title ?? '',
    discipline:     p.project?.disciplines?.[0] ?? '',
    content:        p.content,
    stat:           `${p.project?.followerCount ?? 0} following`,
    likeCount:      p.likeCount ?? 0,
    commentCount:   p.commentCount ?? 0,
    createdAt:      p.createdAt,
  }))

  const feedBulletins = bulletins.map(b => ({
    _id:            b._id,
    type:           'bulletin',
    authorUsername: b.author?.username ?? 'unknown',
    authorId:       b.author?._id,
    projectId:      null,
    projectSlug:    '',
    projectName:    b.projectName ?? '',
    discipline:     '',
    content:        b.content,
    stat:           b.role,
    likeCount:      0,
    commentCount:   0,
    createdAt:      b.createdAt,
  }))

  const merged = [...feedPosts, ...feedBulletins].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )

  return NextResponse.json(merged)
}
