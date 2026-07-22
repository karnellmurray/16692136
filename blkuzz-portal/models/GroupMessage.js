import mongoose from 'mongoose'

const GroupMessageSchema = new mongoose.Schema({
  sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  content:    { type: String, required: true, trim: true, maxlength: 1000 },
  room:       { type: String, default: 'lobby', index: true, trim: true, lowercase: true },
  msgType:    { type: String, enum: ['message', 'system'], default: 'message' },
  projectRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  createdAt:  { type: Date, default: Date.now }
})

export default mongoose.models.GroupMessage || mongoose.model('GroupMessage', GroupMessageSchema)
