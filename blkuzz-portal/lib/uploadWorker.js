import connectDB from './mongodb.js'
import MediaUpload from '../models/MediaUpload.js'
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { fileTypeFromBuffer } from 'file-type'
import heicConvert from 'heic-convert'
import { transcodeToH264, processImage, transcodeAudio } from './mediaProcessing.js'

const HEIC_MIMES  = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']
const AUDIO_EXTS  = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'wma', 'opus']
const DOCUMENT_MIMES = { 'application/pdf': 'pdf' }

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const RAW_BUCKET    = process.env.AWS_S3_RAW_BUCKET_NAME
const PUBLIC_BUCKET = process.env.AWS_S3_BUCKET_NAME

async function streamToBuffer(body) {
  const chunks = []
  for await (const chunk of body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function buildPublicUrl(key) {
  const cdn = process.env.AWS_S3_CLOUDFRONT_URL
    ? process.env.AWS_S3_CLOUDFRONT_URL.replace(/\/$/, '')
    : `https://${PUBLIC_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`
  return `${cdn}/${key}`
}

// Documents render as a filename-labeled card client-side rather than a
// thumbnail, so unlike video/image/audio (id-only key is enough) the real
// filename needs to survive into the URL. S3 keys are just strings -- an
// extra "/" segment is a normal, valid part of a key, not a real folder.
function sanitizeFilename(name, ext) {
  const base = (name || '').split(/[/\\]/).pop() || `document.${ext}`
  let cleaned = base.replace(/[^a-zA-Z0-9 ._-]/g, '_').trim().slice(-120) || `document.${ext}`
  if (!cleaned.toLowerCase().endsWith(`.${ext}`)) cleaned += `.${ext}`
  return cleaned
}

function notify(ownerId, event, payload) {
  try {
    global.io?.to(`user:${ownerId}`).emit(event, payload)
  } catch (err) {
    console.error('[uploadWorker] socket notify failed', err.message)
  }
}

// Processes one raw upload: fetch -> sniff -> transcode/resize (existing
// logic, unchanged) -> put to the public bucket at the same uploads/{type}/{id}.{ext}
// shape the old synchronous route used -> delete the raw object -> mark ready.
// Safe to call more than once for the same id (idempotent enough -- see
// plan doc's documented race-window note); the first action is always to
// touch `updatedAt`, which also resets the status endpoint's staleness
// clock so a normal-speed job doesn't get redundantly re-triggered.
export async function runUploadJob(id) {
  await connectDB()

  const doc = await MediaUpload.findOneAndUpdate(
    { _id: id, status: 'processing' },
    { $set: { updatedAt: new Date() } },
    { new: true }
  )
  if (!doc) return // already finished (ready/failed) or doesn't exist -- nothing to do

  try {
    const raw = await s3.send(new GetObjectCommand({ Bucket: RAW_BUCKET, Key: doc.rawKey }))
    const buffer = await streamToBuffer(raw.Body)

    const sniffed = await fileTypeFromBuffer(buffer).catch(() => null)
    const isVideo = (sniffed?.mime || '').startsWith('video/')
    // Header-less mp3/raw audio streams don't always carry a detectable
    // magic number, so fall back to the original filename's extension when
    // sniffing comes back empty -- same spirit as the ext fallback below.
    const originalExt = (doc.originalFilename?.split('.').pop() || '').toLowerCase()
    const isAudio = (sniffed?.mime || '').startsWith('audio/') || (!sniffed && AUDIO_EXTS.includes(originalExt))
    const documentExt = DOCUMENT_MIMES[sniffed?.mime]

    let outBuffer, contentType, ext
    if (isVideo) {
      const inputExt = sniffed?.ext || (doc.originalFilename?.split('.').pop() || 'mp4').toLowerCase()
      try {
        outBuffer   = await transcodeToH264(buffer, inputExt)
        contentType = 'video/mp4'
        ext         = 'mp4'
      } catch {
        // Same fallback the old synchronous route used: don't trust
        // client-claimed type for the stored content-type, just store the
        // raw bytes untyped so it can't be served back as something
        // executable. Landing in the PUBLIC bucket, same as a success --
        // this is still a completed upload from the tracking system's
        // point of view, not a failure.
        outBuffer   = buffer
        contentType = 'application/octet-stream'
        ext         = inputExt
      }
    } else if (isAudio) {
      const inputExt = sniffed?.ext || (originalExt || 'mp3')
      try {
        outBuffer   = await transcodeAudio(buffer, inputExt)
        contentType = 'audio/mpeg'
        ext         = 'mp3'
      } catch {
        outBuffer   = buffer
        contentType = 'application/octet-stream'
        ext         = inputExt
      }
    } else if (documentExt) {
      // Documents (currently just PDF) pass through untouched -- there's no
      // "processing" step that makes sense here the way transcode/resize do
      // for video/image, just re-store the sniffed-and-verified bytes under
      // their real content-type.
      outBuffer   = buffer
      contentType = sniffed.mime
      ext         = documentExt
    } else {
      try {
        // sharp's bundled libheif has no HEVC decoder, so it can't read real
        // iPhone-style HEIC/HEIF photos -- pre-convert those to JPEG with a
        // pure-JS decoder first, then hand off to the existing, unchanged
        // processImage() pipeline like any other image.
        const isHeic  = HEIC_MIMES.includes(sniffed?.mime)
        const srcBuffer = isHeic
          ? Buffer.from(await heicConvert({ buffer, format: 'JPEG', quality: 0.92 }))
          : buffer
        outBuffer   = await processImage(srcBuffer, doc.type)
        contentType = 'image/webp'
        ext         = 'webp'
      } catch {
        outBuffer   = buffer
        contentType = 'application/octet-stream'
        ext         = (doc.originalFilename?.split('.').pop() || 'jpg').toLowerCase()
      }
    }

    const finalKey = documentExt
      ? `uploads/${doc.type}/${doc._id}/${sanitizeFilename(doc.originalFilename, ext)}`
      : `uploads/${doc.type}/${doc._id}.${ext}`
    await s3.send(new PutObjectCommand({
      Bucket:      PUBLIC_BUCKET,
      Key:         finalKey,
      Body:        outBuffer,
      ContentType: contentType,
    }))

    const finalUrl = buildPublicUrl(finalKey)
    doc.status    = 'ready'
    doc.finalUrl  = finalUrl
    doc.updatedAt = new Date()
    await doc.save()

    await s3.send(new DeleteObjectCommand({ Bucket: RAW_BUCKET, Key: doc.rawKey })).catch(err => {
      console.error('[uploadWorker] raw cleanup failed for', doc.rawKey, err.message)
    })

    notify(doc.owner, 'media:ready', { uploadId: doc._id.toString(), url: finalUrl })
  } catch (err) {
    console.error('[uploadWorker] job failed for', id, err.message)
    await MediaUpload.findByIdAndUpdate(id, {
      $set: { status: 'failed', error: err.message?.slice(0, 500), updatedAt: new Date() },
    }).catch(() => {})
    notify(doc.owner, 'media:failed', { uploadId: doc._id.toString() })
  }
}
