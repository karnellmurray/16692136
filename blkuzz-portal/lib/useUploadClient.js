import { apiFetch } from '@/lib/api'

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS  = 5 * 60 * 1000 // give up client-side after 5 minutes

// Presigns a direct-to-S3 upload, uploads the file straight to the raw
// bucket, kicks off async processing, then polls until the processed file
// is ready. Resolves to the final CDN/S3 URL -- the same shape every
// existing call site already expects back from the old synchronous route,
// so callers only need to swap what they await, not how they use the result.
export async function uploadMedia(file, type) {
  const presignRes = await apiFetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, filename: file.name }),
  })
  const presignData = await presignRes.json()
  if (!presignRes.ok) throw new Error(presignData.error || 'Could not start upload')

  const { uploadId, url, fields } = presignData

  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value))
  formData.append('file', file) // must be appended last -- S3 drops anything after it

  const s3Res = await fetch(url, { method: 'POST', body: formData })
  if (!s3Res.ok) throw new Error('Upload to storage failed')

  // Don't block on this -- it just needs to land, the poll loop below is
  // what actually waits for completion (and re-kicks processing itself if
  // this trigger is ever lost).
  apiFetch(`/api/upload/process/${uploadId}`, { method: 'POST' }).catch(() => {})

  const start = Date.now()
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    const statusRes  = await apiFetch(`/api/upload/status/${uploadId}`)
    const statusData = await statusRes.json()
    if (statusData.status === 'ready')  return statusData.url
    if (statusData.status === 'failed') throw new Error(statusData.error || 'Processing failed')
  }

  throw new Error('Upload timed out waiting for processing')
}
