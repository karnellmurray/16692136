import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import ProjectPost from '@/models/ProjectPost'
import '@/models/Project'

const cdn   = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3    = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`
const toCDN = url => {
  if (!url) return url
  if (url.startsWith('http')) return (cdn && url.startsWith(s3)) ? url.replace(s3, cdn) : url
  return cdn ? `${cdn}/${url}` : `${s3}/${url}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const posts = await ProjectPost.find({ type: { $in: ['update', 'media', 'milestone'] } })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('author',  'username')
    .populate('project', 'title slug coverImage coverImagePosition followers status')
    .lean()

  const out = posts
    .filter(p => p.project?.status !== 'completed')
    .map(p => ({
    _id:                p._id,
    type:               p.type,
    content:            p.content,
    handle:             `@${p.author?.username ?? 'unknown'}`,
    projectTitle:       p.project?.title ?? '',
    projectSlug:        p.project?.slug ?? '',
    coverImage:         p.project?.coverImage ? toCDN(p.project.coverImage) : null,
    coverImagePosition: p.project?.coverImagePosition ?? '50% 50%',
    media:              p.media ?? [],
    stat:               `${p.project?.followers?.length ?? 0} following`,
    createdAt:          p.createdAt,
  }))

  return NextResponse.json(out)
}
