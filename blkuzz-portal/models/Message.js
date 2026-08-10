import mongoose from 'mongoose'

const MessageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  content:   { type: String, trim: true },
  media:     [{ type: String, trim: true }],
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.models.Message || mongoose.model('Message', MessageSchema)
