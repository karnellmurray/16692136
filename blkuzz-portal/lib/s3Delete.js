import { S3Client, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import connectDB from '@/lib/mongodb'
import MediaUpload from '@/models/MediaUpload'

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET_NAME
const cdn    = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3Base = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`

// This app's own upload pipeline only ever writes finished files under
// this exact prefix. A second, external writer (never identified) puts
// values shaped like "avatars/temp/{username}/..." directly into Mongo,
// bypassing this pipeline entirely -- those must never be touched here.
const OWNED_PREFIX = 'uploads/'

// Resolves a stored value (full CDN URL, full raw S3 URL, or bare key) back
// to a bare S3 key, or null if it doesn't belong to this app's own upload
// pipeline. Only ever returns a key that starts with `uploads/`.
function resolveOwnedKey(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== 'string') return null

  let key = urlOrKey
  if (key.startsWith('http')) {
    if (cdn && key.startsWith(cdn)) key = key.slice(cdn.length)
    else if (key.startsWith(s3Base)) key = key.slice(s3Base.length)
    else return null // some other host entirely -- not ours, don't touch it
    key = key.replace(/^\/+/, '')
  }

  return key.startsWith(OWNED_PREFIX) ? key : null
}

// The worker names finished files `uploads/{type}/{mediaUploadId}.{ext}` --
// the MediaUpload doc's own _id is embedded right in the key, so the
// tracking record can be found without storing/matching finalUrl at all.
const KEY_ID_RE = /^uploads\/[^/]+\/([0-9a-fA-F]{24})\.[^./]+$/
function mediaUploadIdFromKey(key) {
  return key.match(KEY_ID_RE)?.[1] ?? null
}

// Best-effort delete of a single stored media reference. Never throws --
// a cleanup failure must never fail the mutation that's replacing/removing
// the reference. Call ONLY after the corresponding Mongo write has already
// succeeded.
export async function deleteOwnedUpload(urlOrKey) {
  const key = resolveOwnedKey(urlOrKey)
  if (!key) return
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  } catch (err) {
    console.error('[s3Delete] failed to delete', key, err.message)
  }
  const mediaUploadId = mediaUploadIdFromKey(key)
  if (mediaUploadId) {
    try {
      await connectDB()
      await MediaUpload.deleteOne({ _id: mediaUploadId })
    } catch (err) {
      console.error('[s3Delete] failed to delete MediaUpload record', mediaUploadId, err.message)
    }
  }
}

// Best-effort batch delete (e.g. every media URL across a deleted project's
// posts). Still an explicit, bounded list of keys -- never a sweep/listing
// operation. Silently drops anything not owned by this app's own prefix.
export async function deleteOwnedUploads(urlsOrKeys) {
  const keys = [...new Set((urlsOrKeys ?? []).map(resolveOwnedKey).filter(Boolean))]
  if (!keys.length) return
  try {
    // DeleteObjectsCommand caps at 1000 keys per call
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000)
      await s3.send(new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true },
      }))
    }
  } catch (err) {
    console.error('[s3Delete] batch delete failed', err.message)
  }

  const mediaUploadIds = keys.map(mediaUploadIdFromKey).filter(Boolean)
  if (mediaUploadIds.length) {
    try {
      await connectDB()
      await MediaUpload.deleteMany({ _id: { $in: mediaUploadIds } })
    } catch (err) {
      console.error('[s3Delete] batch MediaUpload cleanup failed', err.message)
    }
  }
}
