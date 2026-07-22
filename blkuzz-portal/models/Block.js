import mongoose from 'mongoose'

const BlockSchema = new mongoose.Schema({
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  blocked:   { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  createdAt: { type: Date, default: Date.now },
})

BlockSchema.index({ blockedBy: 1, blocked: 1 }, { unique: true })

export default mongoose.models.Block || mongoose.model('Block', BlockSchema)
