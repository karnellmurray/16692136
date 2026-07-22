const mongoose = require('mongoose')

const SignupSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  username:     { type: String, required: true, unique: true, trim: true, set: v => v.toLowerCase() },
  email:        { type: String, required: true, unique: true, trim: true, set: v => v.toLowerCase() },
  passwordHash: { type: String, required: true },
  discipline:   { type: String, trim: true },
  location: {
    type: String,
    required: true,
    trim: true,
    set: v => {
      if (!v) return v
      const toTitle = s => s.toLowerCase().split(' ')
        .map(w => w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-')).join(' ')
      const parts = v.split(',')
      if (parts.length < 2) return toTitle(v.trim())
      return `${toTitle(parts[0].trim())}, ${parts.slice(1).join(',').trim().toUpperCase()}`
    },
    validate: {
      validator: v => !v || /^[A-Z][a-zA-Z\s\-]+(,\s)[A-Z][a-zA-Z\s]+$/.test(v),
      message:   'Location must be in the format: City, UK'
    }
  },
  phone:        {
    type: String, required: true, unique: true,
    set: v => {
      if (!v) return v
      let c = v.replace(/[\s\-\(\)]/g, '')
      if (c.startsWith('07'))                        return '+44' + c.slice(1)
      if (c.startsWith('44') && !c.startsWith('+')) return '+' + c
      return c
    }
  },
  bio:          { type: String, required: true, trim: true, maxlength: 500 },
  tags:         [{ type: String, trim: true }],
  avatar:       { url: { type: String, trim: true } },
  createdAt:    { type: Date, default: Date.now }
})

SignupSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })
SignupSchema.index({ email:    1 }, { unique: true, collation: { locale: 'en', strength: 2 } })
SignupSchema.index({ phone:    1 }, { unique: true })

module.exports = mongoose.model('Signup', SignupSchema)
