require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const Signup   = require('../models/Signup')

async function check() {
  await mongoose.connect(process.env.MONGODB_URI)

  const total      = await Signup.countDocuments()
  const withAvatar = await Signup.countDocuments({ 'avatar.url': { $exists: true, $ne: null, $ne: '' } })
  const without    = total - withAvatar

  console.log(`Total signups : ${total}`)
  console.log(`With avatar   : ${withAvatar}`)
  console.log(`Without avatar: ${without}`)

  if (without > 0) {
    const names = await Signup.find(
      { $or: [{ 'avatar.url': { $exists: false } }, { 'avatar.url': null }, { 'avatar.url': '' }] },
      { name: 1, _id: 0 }
    ).lean()
    console.log('\nMembers missing avatars:')
    names.forEach(m => console.log(' -', m.name))
  }

  await mongoose.disconnect()
}

check().catch(err => { console.error(err); process.exit(1) })
