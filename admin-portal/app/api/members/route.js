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

  const members = await Signup.find(
    { username: { $exists: true, $ne: null } },
    'username name discipline location createdAt avatar profileImage'
  ).sort({ createdAt: -1 }).limit(50).lean()

  const withProjects = await Promise.all(members.map(async m => {
    const projects = await Project.countDocuments({ creator: m._id })
    return { ...m, projectCount: projects }
  }))

  return NextResponse.json(withProjects)
}
