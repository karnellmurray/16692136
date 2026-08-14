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
    if (!key || !BUCKET) return urlOrKey
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    return await getSignedUrl(s3, command, { expiresIn })
  } catch (err) {
    console.error('[avatar] presign error:', err.message)
    return urlOrKey
  }
}

module.exports = { s3, BUCKET, presignAvatar }
