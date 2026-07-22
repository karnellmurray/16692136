import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Signup from '@/models/Signup'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [fromProjects, fromSignups] = await Promise.all([
    Project.aggregate([
      { $unwind: '$disciplines' },
      { $group: { _id: '$disciplines' } },
    ]),
    Signup.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags' } },
    ]),
  ])

  const merged = [
    ...new Set([
      ...fromProjects.map(r => r._id),
      ...fromSignups.map(r => r._id),
    ]),
  ].filter(Boolean).sort()

  return NextResponse.json(merged)
}
