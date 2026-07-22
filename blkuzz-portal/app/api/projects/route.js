import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Signup from '@/models/Signup'

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

async function uniqueSlug(base) {
  let slug = base, n = 1
  while (await Project.findOne({ slug }).lean()) slug = `${base}-${n++}`
  return slug
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url        = new URL(req.url)
    const discipline = url.searchParams.get('discipline')
    const following  = url.searchParams.get('following')
    const mine       = url.searchParams.get('mine')
    const explore    = url.searchParams.get('explore')

    await connectDB()
    const query = { slug: { $exists: true } }
    if (discipline && discipline !== 'All') {
      const creatorsWithTag = await Signup.find({ tags: discipline }, '_id').lean()
      const creatorIds = creatorsWithTag.map(u => u._id)
      query.$or = [
        { disciplines: discipline },
        { creator: { $in: creatorIds } },
      ]
    }
    if (following === '1') query.followers = session.user.id
    if (mine === '1') query.creator = session.user.id
    if (explore === '1') query.creator = { $ne: session.user.id }
    if (url.searchParams.get('collab') === '1') {
      query.collaboratorsNeeded = true
      query.collaboratorDisciplines = { $exists: true, $not: { $size: 0 } }
    }

    const projects = await Project.find(query)
      .sort({ lastPostAt: -1, createdAt: -1 })
      .populate('creator', 'username avatar profileImage tags')
      .lean()

    const cdn   = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
    const s3    = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`
    const toCDN = url => (cdn && url?.startsWith(s3)) ? url.replace(s3, cdn) : url

    const out = projects.map(p => ({
      ...p,
      creator: p.creator ? {
        ...p.creator,
        profileImage:    toCDN(p.creator.profileImage),
        avatar: p.creator.avatar ? { ...p.creator.avatar, url: toCDN(p.creator.avatar.url) } : p.creator.avatar,
      } : p.creator,
    }))

    return NextResponse.json(out)
  } catch (err) {
    console.error('[GET /api/projects]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, disciplines, tagline, description, location, tags, chapters, coverImage, coverImagePosition, status } = await req.json()
    if (!title?.trim() || !disciplines?.length) {
      return NextResponse.json({ error: 'title and at least one discipline are required' }, { status: 400 })
    }

    await connectDB()
    const slug = await uniqueSlug(slugify(title))

    const defaultChapters = Array.isArray(chapters) && chapters.length
      ? chapters.map(t => ({ title: typeof t === 'string' ? t : t.title, status: 'todo' }))
      : [
          { title: 'Research', status: 'todo' },
          { title: 'Create',   status: 'todo' },
          { title: 'Review',   status: 'todo' },
          { title: 'Launch',   status: 'todo' },
        ]

    const project = await Project.create({
      title:       title.trim(),
      slug,
      creator:     session.user.id,
      disciplines: Array.isArray(disciplines) ? disciplines : [disciplines],
      tagline:     tagline?.trim(),
      description: description?.trim(),
      location:    location?.trim(),
      tags:        Array.isArray(tags) ? tags : [],
      chapters:    defaultChapters,
      coverImage:         coverImage?.trim(),
      coverImagePosition: coverImagePosition ?? '50% 50%',
      status:             status === 'completed' ? 'completed' : 'active',
    })

    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    console.error('[POST /api/projects]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
