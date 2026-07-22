import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Notification from '@/models/Notification'

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const notif = await Notification.findById(params.id)
  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (notif.user.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await notif.deleteOne()
  return NextResponse.json({ ok: true })
}
