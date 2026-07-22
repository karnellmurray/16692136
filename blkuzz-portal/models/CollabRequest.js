import mongoose from 'mongoose'

const { Schema } = mongoose
const ObjectId   = Schema.Types.ObjectId

const CollabRequestSchema = new Schema({
  from:        { type: ObjectId, ref: 'Signup', required: true },
  to:          { type: ObjectId, ref: 'Signup', required: true },
  status:      { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  sentAt:      { type: Date, default: Date.now },
  respondedAt: { type: Date },
})

export default mongoose.models.CollabRequest || mongoose.model('CollabRequest', CollabRequestSchema)
