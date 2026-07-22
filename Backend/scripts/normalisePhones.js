require('dotenv').config()
const mongoose = require('mongoose')
const Signup   = require('../models/Signup')
const { normalisePhone } = require('../utils/phone')

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected')

  const users = await Signup.find({ phone: { $exists: true, $ne: null } }).lean()
  let updated = 0

  for (const user of users) {
    const normalised = normalisePhone(user.phone)
    if (normalised && normalised !== user.phone) {
      await Signup.updateOne({ _id: user._id }, { $set: { phone: normalised } })
      console.log(`  ${user.username}: ${user.phone} → ${normalised}`)
      updated++
    }
  }

  console.log(`Done. ${updated}/${users.length} numbers updated.`)
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
