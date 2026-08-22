import { runUploadJob } from './lib/uploadWorker.js'
import connectDB from './lib/mongodb.js'
import MediaUpload from './models/MediaUpload.js'

const POLL_INTERVAL_MS = 5000

async function pollLoop() {
  await connectDB()
  console.log('[worker] Started, polling every', POLL_INTERVAL_MS, 'ms')

  while (true) {
    try {
      const job = await MediaUpload.findOne({ status: 'processing' }).sort({ createdAt: 1 })
      if (job) {
        console.log('[worker] Processing job', job._id.toString())
        await runUploadJob(job._id.toString())
        console.log('[worker] Finished job', job._id.toString())
      }
    } catch (err) {
      console.error('[worker] Poll loop error:', err.message)
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}

pollLoop()
