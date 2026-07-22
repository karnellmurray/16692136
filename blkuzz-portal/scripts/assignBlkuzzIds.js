// Run: MONGODB_URI="your-uri" node scripts/assignBlkuzzIds.js
// Or set MONGODB_URI in .env.local and run via: node -e "require('dotenv').config({path:'.env.local'})" scripts/assignBlkuzzIds.js
// Or simply: node --env-file=.env.local scripts/assignBlkuzzIds.js  (Node 20.6+)
'use strict'
const mongoose = require('mongoose')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required.')
  process.exit(1)
}

// Minimal schema — just the fields we need
const SignupSchema = new mongoose.Schema(
  { username: String, blkuzzId: String, createdAt: Date },
  { collection: 'signups', strict: false }
)
const Signup = mongoose.models.Signup || mongoose.model('Signup', SignupSchema)

async function assignBlkuzzIds() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB.')

  // Find the highest existing BLK ID so we can continue from it
  const last = await Signup.findOne(
    { blkuzzId: { $exists: true, $ne: null } },
    { blkuzzId: 1 },
    { sort: { blkuzzId: -1 } }
  )

  let counter = 1
  if (last?.blkuzzId) {
    counter = parseInt(last.blkuzzId.replace('BLK-', ''), 10) + 1
    console.log(`Continuing from ${last.blkuzzId} → starting at ${counter}`)
  }

  // Get all users without a blkuzzId, earliest members first
  const users = await Signup.find(
    { blkuzzId: { $exists: false } },
    { username: 1, createdAt: 1 },
    { sort: { createdAt: 1 } }
  )

  if (users.length === 0) {
    console.log('All users already have a Blkuzz ID.')
    process.exit(0)
  }

  console.log(`Assigning IDs to ${users.length} users...`)

  for (const user of users) {
    const blkuzzId = `BLK-${String(counter).padStart(4, '0')}`
    await Signup.updateOne({ _id: user._id }, { $set: { blkuzzId } })
    console.log(`  ${user.username} → ${blkuzzId}`)
    counter++
  }

  console.log('Done.')
  process.exit(0)
}

assignBlkuzzIds().catch(err => {
  console.error(err)
  process.exit(1)
})
