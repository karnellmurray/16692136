import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import HqVideoStats from '@/models/HqVideoStats'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await req.json()
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  await connectDB()
  const doc = await HqVideoStats.findOneAndUpdate(
    { key },
    { $inc: { views: 1 } },
    { upsert: true, new: true }
  )

  return NextResponse.json({ views: doc.views })
}
