const mongoose = require('mongoose')

const OtpSchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  code:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 },
})

OtpSchema.index({ phone: 1 })

module.exports = mongoose.model('Otp', OtpSchema)
