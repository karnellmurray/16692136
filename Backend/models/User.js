const mongoose = require('mongoose')
const { Schema } = mongoose

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  location: {
    type: String,
    trim: true
  },
  tags: [{ type: String, trim: true }],
  collaborationTarget: {
    type: String,
    maxlength: 300
  },
  avatarUrl: {
    type: String,
    trim: true
  },
  socials: [
    {
      platform: { type: String, trim: true },
      handle:   { type: String, trim: true },
      url:      { type: String, trim: true }
    }
  ],
  status: {
    type:    String,
    enum:    ['active', 'inactive'],
    default: 'active'
  },
  isAdmin:   { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

UserSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('User', UserSchema)