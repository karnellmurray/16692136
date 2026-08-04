const Otp = require('../models/Otp')
const { normalisePhone } = require('../utils/phone')

exports.sendCode = async (req, res) => {
  const { phone } = req.body
  if (!phone) return res.status(400).json({ error: 'Phone number required' })

  const e164 = normalisePhone(phone)
  const code = String(Math.floor(100000 + Math.random() * 900000))

  try {
    const recentOtp = await Otp.findOne({
      phone: e164,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    })

    if (recentOtp) {
      return res.status(429).json({
        error: 'Please wait 60 seconds before requesting another code.'
      })
    }

    await Otp.deleteMany({ phone: e164 })
    await Otp.create({ phone: e164, code })

    const twilio = require('twilio')
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    await client.messages.create({
      to: e164,
      from: 'Blkuzz',
      body: `Your Blkuzz verification code is ${code}. Valid for 10 minutes. Do not reply to this number.`
    })

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
