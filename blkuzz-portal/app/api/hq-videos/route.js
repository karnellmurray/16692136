import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import connectDB from '@/lib/mongodb'
import HqVideoStats from '@/models/HqVideoStats'

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const HQ_PREFIX  = 'headquarters/'
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.m4v'])

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME
    const res = await s3.send(new ListObjectsV2Command({
      Bucket:  bucket,
      Prefix:  HQ_PREFIX,
      MaxKeys: 200,
    }))

    const s3Base = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`
    const cdn    = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')

    const keys = (res.Contents ?? []).filter(obj => {
      const dot = obj.Key.lastIndexOf('.')
      if (dot === -1) return false
      return VIDEO_EXTS.has(obj.Key.slice(dot).toLowerCase())
    })

    await connectDB()
    const stats = await HqVideoStats.find({ key: { $in: keys.map(o => o.Key) } }).lean()
    const viewsMap = Object.fromEntries(stats.map(s => [s.key, s.views]))

    const videos = keys.map(obj => {
      const encoded = obj.Key.split('/').map(s => encodeURIComponent(s)).join('/')
      const url = cdn
        ? `${cdn}/${encoded}`
        : `${s3Base}/${encoded}`
      return { url, key: obj.Key, views: viewsMap[obj.Key] ?? 0 }
    })

    return NextResponse.json(videos)
  } catch (err) {
    console.error('[GET /api/hq-videos]', err.name, err.message)
    return NextResponse.json({ error: err.message, code: err.name }, { status: 500 })
  }
}
