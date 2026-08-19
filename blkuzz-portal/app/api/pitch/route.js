import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Pitch from '@/models/Pitch'
import Config from '@/models/Config'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const existing = await Pitch.findOne({
    creator: session.user.id,
    status: 'pending',
  }).lean()

  return NextResponse.json({ existing: existing || null })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  // Block if slots are closed
  const slotsConfig = await Config.findOne({ key: 'slotsRemaining' }).lean()
  const slots = slotsConfig?.value ?? 1
  if (slots <= 0) {
    return NextResponse.json({ error: 'Submissions are closed for this quarter.' }, { status: 403 })
  }

  // Block if user already has a pending submission
  const existing = await Pitch.findOne({ creator: session.user.id, status: 'pending' }).lean()
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending submission.' }, { status: 409 })
  }

  const { projectTitle, membersInvolved, pitch, workLink, supportNeeded, mediaFiles } = await req.json()
  if (!projectTitle?.trim() || !pitch?.trim()) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const doc = await Pitch.create({
    creator:         session.user.id,
    projectTitle:    projectTitle.trim(),
    membersInvolved: Array.isArray(membersInvolved) ? membersInvolved : [],
    pitch:           pitch.trim(),
    workLink:        workLink?.trim() || '',
    supportNeeded:   supportNeeded?.trim() || '',
    mediaFiles:      Array.isArray(mediaFiles) ? mediaFiles.filter(Boolean) : [],
  })

  // Decrement slots
  await Config.findOneAndUpdate(
    { key: 'slotsRemaining' },
    { $inc: { value: -1 }, updatedAt: new Date() },
    { upsert: true }
  )

  return NextResponse.json({ ok: true, id: doc._id }, { status: 201 })
}
