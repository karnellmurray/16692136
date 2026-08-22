import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import Project from '@/models/Project'

const cdn = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3  = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3)) ? raw.replace(s3, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3}/${raw}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const members = await Signup.find(
    {},
    'username name email phone discipline location bio createdAt avatar profileImage tags blkuzzId'
  ).sort({ createdAt: -1 }).limit(50).lean()

  const withProjects = await Promise.all(members.map(async m => {
    const projectCount = await Project.countDocuments({ creator: m._id })
    const rawAvatar = m.avatar?.url || (typeof m.avatar === 'string' ? m.avatar : null) || m.profileImage || null
    return { ...m, projectCount, avatarUrl: toUrl(rawAvatar) }
  }))

  return NextResponse.json(withProjects)
}

const EDITABLE_FIELDS = ['name', 'username', 'email', 'phone', 'discipline', 'location', 'bio', 'tags']

// Mongoose schema setters don't run on findByIdAndUpdate's $set — only on
// document.save() — so phone normalisation has to happen here explicitly.
function normalisePhone(v) {
  if (!v) return v
  const c = v.replace(/[\s\-\(\)]/g, '')
  if (c.startsWith('07'))                        return '+44' + c.slice(1)
  if (c.startsWith('44') && !c.startsWith('+')) return '+' + c
  return c
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'Member id is required.' }, { status: 400 })

  const set = {}
  for (const key of EDITABLE_FIELDS) {
    if (fields[key] === undefined) continue
    set[key] = key === 'tags'
      ? fields[key]
      : typeof fields[key] === 'string' ? fields[key].trim() : fields[key]
  }
  if (set.phone) set.phone = normalisePhone(set.phone)

  await connectDB()
  const updated = await Signup.findByIdAndUpdate(id, { $set: set }, { new: true }).select('-passwordHash').lean()
  if (!updated) return NextResponse.json({ error: 'Member not found.' }, { status: 404 })

  return NextResponse.json(updated)
}
