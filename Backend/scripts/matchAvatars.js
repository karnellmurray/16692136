require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose             = require('mongoose')
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3')
const Signup               = require('../models/Signup')

const s3     = new S3Client({ region: process.env.AWS_REGION || 'eu-north-1' })
const BUCKET = process.env.AWS_S3_BUCKET_NAME

async function listAllKeys() {
  const keys = []
  let token
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }))
    ;(res.Contents || []).forEach(obj => keys.push(obj.Key))
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)
  return keys
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB\n')

  const allKeys = await listAllKeys()
  console.log(`Found ${allKeys.length} objects in S3:\n`)
  allKeys.forEach(k => console.log(' ', k))

  const missing = await Signup.find(
    { $or: [{ 'avatar.url': { $exists: false } }, { 'avatar.url': null }, { 'avatar.url': '' }] }
  ).lean()

  console.log(`\nTrying to match ${missing.length} members without avatars...\n`)

  for (const member of missing) {
    const username = (member.name || '').toLowerCase()
    const match = allKeys.find(k => k.toLowerCase().includes(username))
    if (match) {
      await Signup.updateOne({ _id: member._id }, { $set: { 'avatar.url': match } })
      console.log(`✓ Matched "${member.name}" → ${match}`)
    } else {
      console.log(`✗ No match for "${member.name}"`)
    }
  }

  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
