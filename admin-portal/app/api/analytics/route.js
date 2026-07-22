import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import Project from '@/models/Project'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [memberTags, projectDisciplines] = await Promise.all([
    Signup.aggregate([
      { $match: { username: { $exists: true, $ne: null }, tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Project.aggregate([
      { $unwind: '$disciplines' },
      { $group: { _id: '$disciplines', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ])

  const total = memberTags.reduce((s, d) => s + d.count, 0) || 1
  const byTag = memberTags.map(d => ({
    label: d._id,
    members: d.count,
    pct: Math.round((d.count / total) * 100),
  }))

  return NextResponse.json({ byTag, projectDisciplines })
}
