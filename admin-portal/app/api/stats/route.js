import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import Project from '@/models/Project'
import Pitch from '@/models/Pitch'
import BulletinPost from '@/models/BulletinPost'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [totalMembers, liveProjects, pendingPitches] = await Promise.all([
    Signup.countDocuments(),
    Project.countDocuments({ status: { $nin: ['completed', 'on-hold', 'abandoned'] } }),
    Pitch.countDocuments({ status: 'pending' }),
  ])

  const activeToday = await Signup.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  })

  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0)
  const lastMonthTotal = await Signup.countDocuments({ createdAt: { $lt: thisMonth } })
  const newThisMonth = totalMembers - lastMonthTotal

  // Inactive users: no projects and no bulletin posts
  const [activeProjectCreators, activeBulletinAuthors] = await Promise.all([
    Project.distinct('creator'),
    BulletinPost.distinct('author'),
  ])
  const activeUserIds = new Set([
    ...activeProjectCreators.map(id => id.toString()),
    ...activeBulletinAuthors.map(id => id.toString()),
  ])
  const allUserIds = await Signup.distinct('_id')
  const inactiveUsers = allUserIds.filter(id => !activeUserIds.has(id.toString())).length

  return NextResponse.json({
    totalMembers,
    activeToday,
    liveProjects,
    pendingActions: pendingPitches,
    inactiveUsers,
    newThisMonth,
  })
}
