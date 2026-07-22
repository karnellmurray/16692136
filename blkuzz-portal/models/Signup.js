import mongoose from 'mongoose'

const SignupSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  username:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  discipline:   { type: String, trim: true },
  location:     { type: String, trim: true },
  phone:        { type: String, trim: true },
  bio:          { type: String, trim: true, maxlength: 500 },
  tags:         [{ type: String, trim: true }],
  avatar:       { url: { type: String, trim: true } },
  profileImage: { type: String, trim: true },
  links: {
    portfolio:  { type: String, trim: true },
    instagram:  { type: String, trim: true },
    other:      { type: String, trim: true },
  },
  skills:          [{ type: String, trim: true }],
  openToCollab:    { type: Boolean, default: true },
  showInDirectory: { type: Boolean, default: true },
  showProjects:    { type: Boolean, default: true },
  blkuzzId:           { type: String, unique: true, sparse: true, index: true },
  usernameChangedAt:  { type: Date, default: null },
  lastActiveAt:       { type: Date, default: null },
  isOnline:           { type: Boolean, default: false },
  followers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Signup' }],
  following:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Signup' }],
  role:         { type: String, enum: ['member', 'admin'], default: 'member' },
  createdAt:    { type: Date, default: Date.now }
})

export default mongoose.models.Signup || mongoose.model('Signup', SignupSchema)
