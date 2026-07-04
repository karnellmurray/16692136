import mongoose from 'mongoose'

const PitchSchema = new mongoose.Schema({
  creator:         { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  projectTitle:    { type: String, required: true, trim: true },
  membersInvolved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Signup' }],
  pitch:           { type: String, required: true, trim: true },
  workLink:        { type: String, trim: true },
  supportNeeded:   { type: String, trim: true },
  status:          { type: String, enum: ['pending', 'reviewed', 'accepted', 'declined'], default: 'pending' },
  submittedAt:     { type: Date, default: Date.now },
  respondedAt:     { type: Date },
  responseNote:    { type: String, trim: true },
})

export default mongoose.models.Pitch || mongoose.model('Pitch', PitchSchema)
