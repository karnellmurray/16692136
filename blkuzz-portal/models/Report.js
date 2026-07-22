import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema({
  reportedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  reported:         { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  context:          { type: String, default: 'inbox' },
  conversationWith: { type: mongoose.Schema.Types.ObjectId, ref: 'Signup' },
  status:           { type: String, enum: ['pending', 'reviewed', 'actioned'], default: 'pending' },
  createdAt:        { type: Date, default: Date.now },
})

export default mongoose.models.Report || mongoose.model('Report', ReportSchema)
