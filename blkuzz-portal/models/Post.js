import mongoose from 'mongoose'

const PostSchema = new mongoose.Schema({
  project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  content:   { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.models.Post || mongoose.model('Post', PostSchema)
