import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Pitch from '@/models/Pitch'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const pitches = await Pitch.find()
    .populate('creator', 'username name discipline')
    .sort({ submittedAt: -1 })
    .limit(20)
    .lean()

  return NextResponse.json(pitches)
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, responseNote } = await req.json()
  await connectDB()

  const pitch = await Pitch.findByIdAndUpdate(id, {
    status,
    responseNote,
    respondedAt: new Date(),
  }, { new: true })

  return NextResponse.json(pitch)
}
