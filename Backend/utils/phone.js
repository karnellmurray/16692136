function normalisePhone(phone) {
  if (!phone) return null
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (cleaned.startsWith('07'))                              return '+44' + cleaned.slice(1)
  if (cleaned.startsWith('44') && !cleaned.startsWith('+')) return '+' + cleaned
  return cleaned
}

module.exports = { normalisePhone }
