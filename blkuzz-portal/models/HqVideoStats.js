import mongoose from 'mongoose'

const HqVideoStatsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  views: { type: Number, default: 0 },
})

export default mongoose.models.HqVideoStats || mongoose.model('HqVideoStats', HqVideoStatsSchema)
