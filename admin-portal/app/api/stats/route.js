import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import Project from '@/models/Project'
import Pitch from '@/models/Pitch'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [totalMembers, liveProjects, pendingPitches, pendingApplications] = await Promise.all([
    Signup.countDocuments({ username: { $exists: true, $ne: null } }),
    Project.countDocuments(),
    Pitch.countDocuments({ status: 'pending' }),
    Signup.countDocuments({ username: { $exists: false } }),
  ])

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const activeToday = await Signup.countDocuments({
    username: { $exists: true, $ne: null },
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  })

  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0)
  const newThisMonth = await Signup.countDocuments({
    username: { $exists: true, $ne: null },
    createdAt: { $gte: thisMonth },
  })

  return NextResponse.json({
    totalMembers,
    activeToday,
    liveProjects,
    pendingActions: pendingPitches + pendingApplications,
    newThisMonth,
  })
}
