import mongoose from 'mongoose'

const LoginAttemptSchema = new mongoose.Schema({
  success:   { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', LoginAttemptSchema)
