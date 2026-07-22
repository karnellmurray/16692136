const Otp = require('../models/Otp')
const { normalisePhone } = require('../utils/phone')

exports.sendCode = async (req, res) => {
  const { phone } = req.body
  if (!phone) return res.status(400).json({ error: 'Phone number required' })

  const e164 = normalisePhone(phone)
  const code = String(Math.floor(100000 + Math.random() * 900000))

  try {
    await Otp.deleteMany({ phone: e164 })
    await Otp.create({ phone: e164, code })

    const gatewayUrl = process.env.SMS_GATEWAY_URL || 'http://192.168.0.11:8080'
    const gwUser     = process.env.SMS_GATEWAY_USER
    const gwPass     = process.env.SMS_GATEWAY_PASS

    const headers = { 'Content-Type': 'application/json' }
    if (gwUser && gwPass) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${gwUser}:${gwPass}`).toString('base64')
    }

    const gwRes  = await fetch(`${gatewayUrl}/message`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({
        message:      `Your verification code is ${code}. Valid for 10 minutes -Blkuzz Headquarters`,
        phoneNumbers: [e164],
      }),
    })
    if (!gwRes.ok) {
      const gwErr = await gwRes.text().catch(() => gwRes.status)
      throw new Error(`SMS gateway error: ${gwErr}`)
    }

    res.json({ sent: true })
  } catch (err) {
    console.error('[verify/send]', err.name, err.message, err.$metadata?.httpStatusCode)
    res.status(500).json({ error: 'Failed to send verification code. Please check your number and try again.' })
  }
}

exports.checkCode = async (req, res) => {
  const { phone, code } = req.body
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' })

  const e164 = normalisePhone(phone)
  const otp  = await Otp.findOne({ phone: e164 })

  if (!otp || otp.code !== String(code).trim()) {
    return res.status(400).json({ error: 'Invalid or expired code' })
  }

  await Otp.deleteOne({ _id: otp._id })
  res.json({ valid: true })
}
