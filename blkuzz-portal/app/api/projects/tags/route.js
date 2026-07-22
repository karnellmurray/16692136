import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const result = await Signup.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags' } },
    { $sort: { _id: 1 } },
  ])

  return NextResponse.json(result.map(r => r._id).filter(Boolean))
}
