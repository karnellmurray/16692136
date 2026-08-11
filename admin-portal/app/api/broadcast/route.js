import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import BroadcastLog from '@/models/BroadcastLog'
import { getTwilioClient } from '@/lib/twilio'

const MAX_LEN               = 160
const RATE_LIMIT_MAX        = 3
const RATE_LIMIT_WINDOW_MS  = 60 * 60 * 1000

function blkId(m) {
  if (m.blkuzzId) return m.blkuzzId
  const n = parseInt(String(m._id).slice(-6), 16) % 9999 + 1
  return `BLK-${String(n).padStart(4, '0')}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const logs = await BroadcastLog.find().sort({ sentAt: -1 }).limit(10).lean()
  return NextResponse.json(logs)
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Broadcast id is required.' }, { status: 400 })

  await connectDB()
  const deleted = await BroadcastLog.findByIdAndDelete(id)
  if (!deleted) return NextResponse.json({ error: 'Broadcast not found.' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, recipients } = await req.json()

  if (!message || !message.trim()) return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  if (message.length > MAX_LEN) return NextResponse.json({ error: `Message must be ${MAX_LEN} characters or fewer.` }, { status: 400 })
  if (recipients !== 'all' && !Array.isArray(recipients)) return NextResponse.json({ error: 'Invalid recipients.' }, { status: 400 })
  if (Array.isArray(recipients) && recipients.length === 0) return NextResponse.json({ error: 'Select at least one member.' }, { status: 400 })

  await connectDB()

  const windowStart  = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
  const recentCount  = await BroadcastLog.countDocuments({ sentAt: { $gt: windowStart } })
  if (recentCount >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: `You have sent ${RATE_LIMIT_MAX} broadcasts in the last hour. Please wait before sending again.` },
      { status: 429 }
    )
  }

  const query = recipients === 'all' ? {} : { _id: { $in: recipients } }
  const users = await Signup.find(query, 'username blkuzzId phone smsNotifications').lean()

  const eligible       = []
  const skippedDetails = []
  for (const u of users) {
    if (!u.phone)                    { skippedDetails.push({ user: blkId(u), reason: 'no phone number' });    continue }
    if (u.smsNotifications === false) { skippedDetails.push({ user: blkId(u), reason: 'SMS notifications off' }); continue }
    eligible.push(u)
  }

  const client  = getTwilioClient()
  const results = await Promise.allSettled(
    eligible.map(u => client.messages.create({ to: u.phone, from: 'Blkuzz', body: message }))
  )

  let sent = 0
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      sent++
    } else {
      console.error('[broadcast] Twilio send failed for', blkId(eligible[i]), r.reason?.message)
      skippedDetails.push({ user: blkId(eligible[i]), reason: 'Twilio send failed' })
    }
  })

  const skipped = skippedDetails.length

  const log = await BroadcastLog.create({
    sentBy:        'admin',
    message,
    recipientType: recipients === 'all' ? 'all' : 'specific',
    recipients:    eligible.map(u => u._id),
    sent,
    skipped,
    skippedDetails,
  })

  console.log(`[broadcast] logId=${log._id} sent=${sent} skipped=${skipped}`, skippedDetails)

  return NextResponse.json({ sent, skipped, skippedReasons: skippedDetails })
}
