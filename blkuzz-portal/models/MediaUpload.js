import mongoose from 'mongoose'

const MediaUploadSchema = new mongoose.Schema({
  owner:            { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  type:             { type: String, enum: ['avatar', 'cover', 'post'], required: true },
  rawKey:           { type: String, required: true },
  originalFilename: { type: String },
  status:           { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
  finalUrl:         { type: String, default: null },
  error:            { type: String, default: null },
  createdAt:        { type: Date, default: Date.now },
  updatedAt:        { type: Date, default: Date.now },
})

MediaUploadSchema.index({ owner: 1, createdAt: -1 })

export default mongoose.models.MediaUpload || mongoose.model('MediaUpload', MediaUploadSchema)
