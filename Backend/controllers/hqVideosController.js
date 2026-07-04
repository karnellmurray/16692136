const { ListObjectsV2Command } = require('@aws-sdk/client-s3')
const { s3, BUCKET }          = require('../config/aws')
const HqVideoStats            = require('../models/HqVideoStats')

const HQ_PREFIX  = 'headquarters/'
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.m4v'])

exports.getHqVideos = async (req, res) => {
  try {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket:  BUCKET,
      Prefix:  HQ_PREFIX,
      MaxKeys: 200,
    }))

    const region  = process.env.AWS_REGION || 'eu-north-1'
    const s3Base  = `https://${BUCKET}.s3.${region}.amazonaws.com`
    const cdn     = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')

    const keys = (result.Contents ?? []).filter(obj => {
      const dot = obj.Key.lastIndexOf('.')
      return dot !== -1 && VIDEO_EXTS.has(obj.Key.slice(dot).toLowerCase())
    })

    const stats    = await HqVideoStats.find({ key: { $in: keys.map(o => o.Key) } }).lean()
    const viewsMap = Object.fromEntries(stats.map(s => [s.key, s.views]))

    const videos = keys.map(obj => {
      const encoded = obj.Key.split('/').map(s => encodeURIComponent(s)).join('/')
      const url = cdn ? `${cdn}/${encoded}` : `${s3Base}/${encoded}`
      return { url, key: obj.Key, views: viewsMap[obj.Key] ?? 0 }
    })

    res.json(videos)
  } catch (err) {
    console.error('[GET /web/api/hq-videos]', err.message)
    res.status(500).json({ error: 'Failed to fetch HQ videos' })
  }
}

exports.recordView = async (req, res) => {
  const { key } = req.body
  if (!key) return res.status(400).json({ error: 'key required' })

  try {
    const doc = await HqVideoStats.findOneAndUpdate(
      { key },
      { $inc: { views: 1 } },
      { upsert: true, new: true }
    )
    res.json({ views: doc.views })
  } catch (err) {
    console.error('[POST /web/api/hq-videos/view]', err.message)
    res.status(500).json({ error: 'Failed to record view' })
  }
}
