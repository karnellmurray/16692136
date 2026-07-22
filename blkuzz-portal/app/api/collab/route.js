import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import CollabRequest from '@/models/CollabRequest'
import Notification from '@/models/Notification'
import Signup from '@/models/Signup'
import '@/models/Block'
import { isBlocked } from '@/lib/blockCheck'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const toId = searchParams.get('to')
  if (!toId) return NextResponse.json({ error: 'Missing to' }, { status: 400 })

  await connectDB()
  const myId = session.user.id

  const request = await CollabRequest.findOne({
    $or: [{ from: myId, to: toId }, { from: toId, to: myId }],
  }).sort({ sentAt: -1 }).lean()

  if (!request) return NextResponse.json({ status: 'none' })

  return NextResponse.json({
    status:    request.status,
    direction: request.from.toString() === myId ? 'sent' : 'received',
    requestId: request._id,
  })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, context, source, bulletinPostId } = await req.json()
  if (!to) return NextResponse.json({ error: 'Missing to' }, { status: 400 })

  const myId = session.user.id
  if (to === myId) return NextResponse.json({ error: 'Cannot collab with yourself' }, { status: 400 })

  await connectDB()

  if (await isBlocked(myId, to)) return NextResponse.json({ error: 'Blocked' }, { status: 403 })

  const sender = await Signup.findById(myId, 'username').lean()

  // Bulletin callout responses always go through — they're independent of existing collab status.
  // For regular collab requests, block duplicates.
  let collabReq
  if (source === 'bulletin') {
    // Block if this specific post was already declined
    if (bulletinPostId) {
      const declined = await Notification.findOne({
        from: myId, user: to, type: 'collab_request',
        bulletinPost: bulletinPostId, status: 'declined',
      }).lean()
      if (declined) return NextResponse.json({ status: 'declined' }, { status: 409 })
    }
    const existingReq = await CollabRequest.findOne({
      $or: [{ from: myId, to }, { from: to, to: myId }],
    }).lean()
    collabReq = existingReq
      ? { _id: existingReq._id }
      : await CollabRequest.create({ from: myId, to })
  } else {
    const existing = await CollabRequest.findOne({
      $or: [{ from: myId, to }, { from: to, to: myId }],
      status: { $in: ['pending', 'accepted'] },
    }).lean()
    if (existing?.status === 'accepted') return NextResponse.json({ status: 'accepted' })
    if (existing?.status === 'pending')  return NextResponse.json({ status: 'pending' })
    collabReq = await CollabRequest.create({ from: myId, to })
  }

  const notifText = source === 'bulletin'
    ? context
      ? `@${sender.username} responded to your callout — "${context}"`
      : `@${sender.username} responded to your callout`
    : context
      ? `@${sender.username} wants to collab — "${context}"`
      : `@${sender.username} wants to collaborate with you`

  await Notification.create({
    user:          to,
    type:          'collab_request',
    from:          myId,
    collabRequest: collabReq._id,
    status:        'pending',
    text:          notifText,
    link:         source === 'bulletin' && bulletinPostId ? `/home/bulletin?post=${bulletinPostId}` : source === 'bulletin' ? '/home/bulletin' : undefined,
    bulletinPost: source === 'bulletin' && bulletinPostId ? bulletinPostId : undefined,
  })

  return NextResponse.json({ status: 'pending', requestId: collabReq._id })
}
