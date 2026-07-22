import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = params
  await connectDB()

  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const target = await Signup.findOne({ username: { $regex: new RegExp(`^${escaped}$`, 'i') } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const myId        = session.user.id
  const isFollowing = target.followers.some(f => f.toString() === myId)

  if (isFollowing) {
    await Signup.findByIdAndUpdate(target._id, { $pull: { followers: myId } })
    await Signup.findByIdAndUpdate(myId, { $pull: { following: target._id } })
  } else {
    await Signup.findByIdAndUpdate(target._id, { $addToSet: { followers: myId } })
    await Signup.findByIdAndUpdate(myId, { $addToSet: { following: target._id } })
  }

  return NextResponse.json({ following: !isFollowing })
}
