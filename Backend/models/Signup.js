const mongoose = require('mongoose')

const SignupSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  username:   { type: String, required: true, unique: true, trim: true, lowercase: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  discipline: { type: String, trim: true },
  location:   { type: String, required: true, trim: true },
  phone:      { type: String, required: true, trim: true },
  bio:        { type: String, required: true, trim: true, maxlength: 500 },
  tags:       [{ type: String, trim: true }],
  avatar:     { url: { type: String, trim: true } },
  createdAt:  { type: Date, default: Date.now }
})

module.exports = mongoose.model('Signup', SignupSchema)
