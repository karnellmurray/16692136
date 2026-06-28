const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl }               = require('@aws-sdk/s3-request-presigner')

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

const BUCKET = process.env.AWS_S3_BUCKET_NAME

function extractKey(urlOrKey) {
  if (!urlOrKey) return null
  try {
    if (urlOrKey.startsWith('http')) return new URL(urlOrKey).pathname.slice(1)
  } catch {}
  return urlOrKey
}

async function presignAvatar(urlOrKey, expiresIn = 3600) {
  try {
    const key = extractKey(urlOrKey)
    console.log('[avatar] raw value:', urlOrKey)
    console.log('[avatar] extracted key:', key)
    console.log('[avatar] bucket:', BUCKET)
    if (!key || !BUCKET) return urlOrKey
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    const signed = await getSignedUrl(s3, command, { expiresIn })
    console.log('[avatar] presigned URL:', signed)
    return signed
  } catch (err) {
    console.error('[avatar] presign error:', err.message)
    return urlOrKey
  }
}

module.exports = { s3, BUCKET, presignAvatar }
