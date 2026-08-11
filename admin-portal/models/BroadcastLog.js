import mongoose from 'mongoose'

const BroadcastLogSchema = new mongoose.Schema({
  sentBy:         { type: String, default: 'admin' },
  message:        { type: String, required: true },
  recipientType:  { type: String, enum: ['all', 'specific'], required: true },
  recipients:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Signup' }],
  sent:           { type: Number, default: 0 },
  skipped:        { type: Number, default: 0 },
  skippedDetails: [{ user: String, reason: String }],
  sentAt:         { type: Date, default: Date.now },
})

export default mongoose.models.BroadcastLog || mongoose.model('BroadcastLog', BroadcastLogSchema)
