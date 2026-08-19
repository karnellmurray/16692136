import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import MediaUpload from '@/models/MediaUpload'
import { S3Client } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const RAW_BUCKET = process.env.AWS_S3_RAW_BUCKET_NAME

// Single generous cap covering both images and video -- the actual file
// type isn't trusted/known until the worker re-sniffs it post-upload, so
// this range is deliberately not split per-type. Adjust as needed.
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024
const PRESIGN_EXPIRES_SECONDS = 600

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!RAW_BUCKET) {
    return NextResponse.json({ error: 'Raw upload bucket is not configured yet' }, { status: 503 })
  }

  const { type: rawType, filename } = await req.json()
  const type = ['avatar', 'cover', 'post'].includes(rawType) ? rawType : 'post'

  const ext = (filename?.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'

  await connectDB()
  const doc = new MediaUpload({
    owner:            session.user.id,
    type,
    originalFilename: filename || '',
    status:           'processing',
  })
  doc.rawKey = `${type}/${doc._id}.${ext}`
  await doc.save()

  const { url, fields } = await createPresignedPost(s3, {
    Bucket:      RAW_BUCKET,
    Key:         doc.rawKey,
    Expires:     PRESIGN_EXPIRES_SECONDS,
    Conditions: [
      ['content-length-range', 0, MAX_UPLOAD_BYTES],
    ],
  })

  return NextResponse.json({ uploadId: doc._id.toString(), url, fields })
}
