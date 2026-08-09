import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import BulletinPost from '@/models/BulletinPost'
import '@/models/Project'

const cdn   = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3    = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`
const toCDN = url => (cdn && url?.startsWith(s3)) ? url.replace(s3, cdn) : url

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const mine = new URL(req.url).searchParams.get('mine') === '1'
    const query = mine
      ? { author: session.user.id }
      : { completed: { $ne: true } }

    await connectDB()
    const posts = await BulletinPost.find(query)
      .populate('author', 'username avatar profileImage')
      .populate('projectRef', 'title slug status coverImage')
      .sort({ createdAt: -1 })
      .lean()

    const normalised = posts
      .filter(p => !p.projectRef || p.projectRef.status !== 'completed')
      .map(p => ({
      ...p,
      author: p.author ? {
        ...p.author,
        profileImage: toCDN(p.author.profileImage),
        avatar: p.author.avatar ? { ...p.author.avatar, url: toCDN(p.author.avatar.url) } : p.author.avatar,
      } : p.author,
      projectRef: p.projectRef ? {
        ...p.projectRef,
        coverImage: toCDN(p.projectRef.coverImage),
      } : p.projectRef,
    }))

    return NextResponse.json(normalised)
  } catch (err) {
    console.error('[GET /api/collaborate]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role, projectName, content, tags, category, urgent, media, projectRef, date } = await req.json()
    if (!role || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    await connectDB()
    const post = await BulletinPost.create({
      author:      session.user.id,
      role:        role.trim(),
      projectName: projectName?.trim() || '',
      content:     content.trim(),
      tags:        tags?.filter(Boolean) || [],
      projectRef:  projectRef || null,
      media:       Array.isArray(media) ? media.filter(Boolean) : [],
      category:    ['Looking for', 'Open to work', 'Events'].includes(category) ? category : 'Looking for',
      urgent:      !!urgent,
      date:        date || null,
    })

    return NextResponse.json(post, { status: 201 })
  } catch (err) {
    console.error('[POST /api/collaborate]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
