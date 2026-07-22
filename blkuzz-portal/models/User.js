import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  bio:          { type: String, default: '', maxlength: 500 },
  profileImage: { type: String, default: '' },
  followers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt:    { type: Date, default: Date.now }
})

export default mongoose.models.User || mongoose.model('User', UserSchema)
