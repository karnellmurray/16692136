import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { spawn } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const LOGO_PATH = join(process.cwd(), 'public', 'images', 'blkuzz-logo.png')

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET_NAME

// Resize + compress based on upload purpose
const PROFILES = {
  avatar: { width: 400,  height: 400,  fit: 'cover',  quality: 88 },
  cover:  { width: 2400, height: null, fit: 'inside', quality: 92 },
  post:   { width: 1800, height: null, fit: 'inside', quality: 90 },
}

async function transcodeToH264(inputBuffer, inputExt) {
  const tmpIn  = join(tmpdir(), `${randomUUID()}.${inputExt}`)
  const tmpOut = join(tmpdir(), `${randomUUID()}.mp4`)

  await writeFile(tmpIn, inputBuffer)

  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-i', tmpIn,
      '-i', LOGO_PATH,
      '-filter_complex', '[1:v]scale=180:-1,format=rgba,colorchannelmixer=aa=0.8[wm];[0:v][wm]overlay=W-w-20:H-h-20:format=auto',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      '-y', tmpOut,
    ])
    let stderr = ''
    ff.stderr.on('data', d => { stderr += d })
    ff.on('error', reject)
    ff.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`)))
  })

  const outBuffer = await readFile(tmpOut)
  await Promise.all([unlink(tmpIn), unlink(tmpOut)]).catch(() => {})
  return outBuffer
}

async function processImage(buffer, type) {
  const profile = PROFILES[type] ?? PROFILES.post
  const pipeline = sharp(buffer)
    .rotate()
    .resize(profile.width, profile.height ?? null, {
      fit: profile.fit,
      withoutEnlargement: true,
      ...(profile.fit === 'cover' ? { position: 'centre' } : {}),
    })
    .webp({ quality: profile.quality })

  return pipeline.toBuffer()
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file     = formData.get('file')
  const rawType  = formData.get('type')
  const type     = ['avatar', 'cover', 'post'].includes(rawType) ? rawType : 'post'
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const raw  = Buffer.from(await file.arrayBuffer())
  let buffer, contentType, ext

  const isVideoFile = (file.type || '').startsWith('video/')

  if (isVideoFile) {
    const inputExt = file.name.split('.').pop().toLowerCase() || 'mp4'
    try {
      buffer      = await transcodeToH264(raw, inputExt)
      contentType = 'video/mp4'
      ext         = 'mp4'
    } catch {
      // Processing failed -- don't trust the client-claimed MIME type for
      // the raw fallback (could be used to store e.g. text/html and have
      // it served back with that content-type from the CDN).
      buffer      = raw
      contentType = 'application/octet-stream'
      ext         = inputExt
    }
  } else {
    try {
      buffer      = await processImage(raw, type)
      contentType = 'image/webp'
      ext         = 'webp'
    } catch {
      buffer      = raw
      contentType = 'application/octet-stream'
      ext         = file.name.split('.').pop().toLowerCase() || 'jpg'
    }
  }

  const key = `uploads/${type}/${randomUUID()}.${ext}`

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }))

  const base = process.env.AWS_S3_CLOUDFRONT_URL
    ? process.env.AWS_S3_CLOUDFRONT_URL.replace(/\/$/, '')
    : `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`
  const url = `${base}/${key}`
  return NextResponse.json({ url })
}
