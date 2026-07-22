import mongoose from 'mongoose'

const BulletinPostSchema = new mongoose.Schema({
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'Signup', required: true },
  role:        { type: String, required: true, trim: true },
  projectName: { type: String, trim: true },
  content:     { type: String, required: true, trim: true, maxlength: 500 },
  tags:        [{ type: String, trim: true }],
  projectRef:  { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  media:       [{ type: String, trim: true }],
  category:    { type: String, enum: ['Looking for', 'Open to work', 'Events'], default: 'Looking for' },
  urgent:      { type: Boolean, default: false },
  completed:   { type: Boolean, default: false },
  date:        { type: Date, default: null },
  createdAt:   { type: Date, default: Date.now }
})

export default mongoose.models.BulletinPost || mongoose.model('BulletinPost', BulletinPostSchema)
