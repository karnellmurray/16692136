import mongoose from 'mongoose'

const SignupSchema = new mongoose.Schema({
  username:     { type: String, trim: true },
  name:         { type: String, trim: true },
  email:        { type: String, lowercase: true, trim: true },
  passwordHash: { type: String },
  discipline:   { type: String },
  location:     { type: String },
  bio:          { type: String },
  phone: {
    type: String, trim: true,
    set: v => {
      if (!v) return v
      const c = v.replace(/[\s\-\(\)]/g, '')
      if (c.startsWith('07'))                        return '+44' + c.slice(1)
      if (c.startsWith('44') && !c.startsWith('+')) return '+' + c
      return c
    }
  },
  blkuzzId:     { type: String },
  smsNotifications: { type: Boolean, default: true },
  tags:         [{ type: String }],
  avatar:       { url: String, key: String },
  profileImage: { type: String },
  followers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Signup' }],
  following:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Signup' }],
  createdAt:    { type: Date, default: Date.now },
})

export default mongoose.models.Signup || mongoose.model('Signup', SignupSchema)
