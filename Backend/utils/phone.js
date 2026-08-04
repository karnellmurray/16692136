function normalisePhone(phone) {
  if (!phone) return null
  let cleaned = phone
    .replace(/\(0\)/g, '')       // drop the "(0)" trunk-prefix notation, e.g. "+44 (0) 7911 123456"
    .replace(/[\s\-\(\)]/g, '')  // strip remaining whitespace, dashes, and any leftover parens
  if (cleaned.startsWith('07'))                              return '+44' + cleaned.slice(1)
  if (cleaned.startsWith('44') && !cleaned.startsWith('+')) return '+' + cleaned
  return cleaned
}

module.exports = { normalisePhone }
