import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import MediaUpload from '@/models/MediaUpload'
import { runUploadJob } from '@/lib/uploadWorker'

// A job is only re-kicked if it's been sitting at "processing" longer than
// this. Long enough that a normal transcode could still genuinely be in
// flight, short enough to catch an abandoned trigger (closed tab, dropped
// network request right after the S3 upload finished).
const STALE_MS = 90 * 1000

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const doc = await MediaUpload.findById(params.id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.owner.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (doc.status === 'processing' && Date.now() - new Date(doc.updatedAt).getTime() > STALE_MS) {
    // Retry backstop -- piggybacked on the poll the client already has to
    // make. This is the only mechanism that re-drives an upload whose
    // original /process trigger never landed.
    runUploadJob(doc._id.toString()).catch(err => {
      console.error('[upload/status] retry kick failed', err.message)
    })
  }

  return NextResponse.json({ status: doc.status, url: doc.finalUrl, error: doc.error })
}
