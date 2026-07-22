import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Report from '@/models/Report'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const reports = await Report.find()
    .populate('reportedBy', 'username name avatar profileImage')
    .populate('reported', 'username name avatar profileImage')
    .populate('conversationWith', 'username')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json(reports)
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status } = await req.json()
  if (!['reviewed', 'actioned'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  await connectDB()
  await Report.findByIdAndUpdate(id, { status })
  return NextResponse.json({ ok: true })
}
