import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'

const cdn   = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3    = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`
const toCDN = url => {
  if (!url) return url
  if (url.startsWith('http')) return (cdn && url.startsWith(s3)) ? url.replace(s3, cdn) : url
  return cdn ? `${cdn}/${url}` : `${s3}/${url}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const user = await Signup.findById(session.user.id)
    .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
    .lean()

  return NextResponse.json({
    ...user,
    profileImage: toCDN(user.profileImage),
    avatar: user.avatar ? { ...user.avatar, url: toCDN(user.avatar.url) } : user.avatar,
  })
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bio, location, profileImage, links, tags, skills, openToCollab, showInDirectory, showProjects, username } = await req.json()

  await connectDB()

  let currentUsername = null

  // Username change — validate cooldown + uniqueness
  if (username !== undefined) {
    const clean = username.trim().toLowerCase()

    if (!/^[a-z0-9_]{3,20}$/.test(clean))
      return NextResponse.json({ error: 'Username must be 3–20 characters: letters, numbers, underscores only.' }, { status: 400 })

    const current = await Signup.findById(session.user.id, 'username usernameChangedAt').lean()
    currentUsername = current.username

    if (clean !== current.username) {
      if (current.usernameChangedAt) {
        const daysSince = (Date.now() - new Date(current.usernameChangedAt)) / 86400000
        if (daysSince < 14) {
          const daysLeft = Math.ceil(14 - daysSince)
          return NextResponse.json({ error: `You can change your username again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`, daysLeft }, { status: 429 })
        }
      }

      const taken = await Signup.findOne({ username: clean, _id: { $ne: session.user.id } }, '_id').lean()
      if (taken) return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 })
    }
  }

  const set = { bio, profileImage, links }
  if (location        !== undefined) set.location        = location
  if (tags            !== undefined) set.tags            = Array.isArray(tags) ? tags.slice(0, 4) : tags
  if (skills          !== undefined) set.skills          = skills
  if (openToCollab    !== undefined) set.openToCollab    = openToCollab
  if (showInDirectory !== undefined) set.showInDirectory = showInDirectory
  if (showProjects    !== undefined) set.showProjects    = showProjects
  if (username !== undefined) {
    const clean = username.trim().toLowerCase()
    if (clean !== currentUsername) {
      set.username          = clean
      set.usernameChangedAt = new Date()
    }
  }

  const update = { $set: set }
  if (profileImage) update.$unset = { 'avatar.url': '' }
  const user = await Signup.findByIdAndUpdate(
    session.user.id,
    update,
    { new: true, select: '-passwordHash' }
  ).lean()

  return NextResponse.json(user)
}
