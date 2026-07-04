const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  views: { type: Number, default: 0 },
})

module.exports = mongoose.models.HqVideoStats || mongoose.model('HqVideoStats', schema)
