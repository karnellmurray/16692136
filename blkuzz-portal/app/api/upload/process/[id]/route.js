import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import MediaUpload from '@/models/MediaUpload'
import { runUploadJob } from '@/lib/uploadWorker'

// Fired by the client immediately after its own direct-to-S3 upload
// completes. Kicks off processing without waiting for it -- the request
// returns fast regardless of how long the transcode takes, since the
// actual work continues after the response in this same warm process.
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const doc = await MediaUpload.findById(params.id, 'owner').lean()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.owner.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  runUploadJob(params.id).catch(err => {
    console.error('[upload/process] unhandled worker error', err.message)
  })

  return NextResponse.json({ ok: true }, { status: 202 })
}
