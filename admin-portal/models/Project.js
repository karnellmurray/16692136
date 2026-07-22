import mongoose from 'mongoose'

const ProjectSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  slug:        { type: String },
  creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'Signup' },
  disciplines: [String],
  status:      { type: String, enum: ['active', 'completed', 'on-hold', 'abandoned'], default: 'active' },
  followers:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Signup' }],
  createdAt:   { type: Date, default: Date.now },
})

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema)
