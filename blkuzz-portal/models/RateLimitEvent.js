import mongoose from 'mongoose'

const RateLimitEventSchema = new mongoose.Schema({
  key:       { type: String, required: true, index: true },
  success:   { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

RateLimitEventSchema.index({ key: 1, createdAt: 1 })

export default mongoose.models.RateLimitEvent || mongoose.model('RateLimitEvent', RateLimitEventSchema)
