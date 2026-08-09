import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import BulletinPost from '@/models/BulletinPost'

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const post = await BulletinPost.findById(params.id)
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { role, projectName, content, tags, category, urgent, media, projectRef, completed, date } = await req.json()

    if (role        !== undefined) post.role        = role
    if (projectName !== undefined) post.projectName = projectName
    if (content     !== undefined) post.content     = content
    if (tags        !== undefined) post.tags        = tags
    if (category    !== undefined) post.category    = category
    if (urgent      !== undefined) post.urgent      = urgent
    if (media       !== undefined) post.media       = media
    if (completed   !== undefined) post.completed   = completed
    if (date        !== undefined) post.date        = date || null
    if (projectRef  !== undefined) post.projectRef  = projectRef || null

    await post.save()
    return NextResponse.json(post)
  } catch (err) {
    console.error('[PATCH /api/collaborate/[id]]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const post = await BulletinPost.findById(params.id)
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await post.deleteOne()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/collaborate/[id]]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
