import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Notification from '@/models/Notification'
import Project from '@/models/Project'
import CollabRequest from '@/models/CollabRequest'
import Message from '@/models/Message'
import Signup from '@/models/Signup'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()
  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  await connectDB()
  const notif = await Notification.findById(params.id)
  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (notif.user.toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!['collab_invite', 'collab_request'].includes(notif.type)) {
    return NextResponse.json({ error: 'Not an invite' }, { status: 400 })
  }
  if (notif.status !== 'pending') {
    return NextResponse.json({ error: 'Already responded' }, { status: 409 })
  }

  notif.status = action === 'accept' ? 'accepted' : 'declined'
  notif.read = true
  await notif.save()

  // ── Project collab invite ──────────────────────────────────────────────────
  if (notif.type === 'collab_invite') {
    const project = notif.project ? await Project.findById(notif.project, 'title collaborators') : null

    if (action === 'accept' && project) {
      project.collaborators.push({ user: session.user.id, role: notif.role || '' })
      await project.save()
    }

    if (notif.from) {
      const me = await Signup.findById(session.user.id, 'username').lean()
      const projectTitle = project?.title ?? 'your project'
      await Notification.create({
        user:    notif.from,
        type:    'collab_invite',
        from:    session.user.id,
        project: notif.project,
        role:    notif.role || '',
        status:  action === 'accept' ? 'accepted' : 'declined',
        text:    action === 'accept'
          ? `@${me?.username ?? 'someone'} accepted your invite to collaborate on "${projectTitle}"`
          : `@${me?.username ?? 'someone'} declined your invite to collaborate on "${projectTitle}"`,
        link:    notif.link,
        read:    false,
      })
    }

    return NextResponse.json({ ok: true, status: notif.status })
  }

  // ── Member collab request ──────────────────────────────────────────────────
  if (notif.type === 'collab_request' && notif.collabRequest) {
    const collabReq = await CollabRequest.findById(notif.collabRequest)
    if (collabReq) {
      collabReq.status      = action === 'accept' ? 'accepted' : 'declined'
      collabReq.respondedAt = new Date()
      await collabReq.save()
    }

    const me = await Signup.findById(session.user.id, 'username').lean()
    const isBulletin = notif.link === '/home/collaborate'
    const reqLabel = isBulletin ? 'bulletin request' : 'collab request'

    if (action === 'accept') {
      await Message.create({
        sender:    session.user.id,
        recipient: notif.from,
        content:   `@${me.username} accepted your ${reqLabel}. You're now connected on Blkuzz.`,
      })
      await Notification.create({
        user:          notif.from,
        type:          'collab_request',
        from:          session.user.id,
        collabRequest: notif.collabRequest,
        status:        'accepted',
        text:          `@${me.username} accepted your ${reqLabel}`,
        link:          '/home/inbox',
        read:          false,
      })
    } else {
      await Notification.create({
        user:          notif.from,
        type:          'collab_request',
        from:          session.user.id,
        collabRequest: notif.collabRequest,
        status:        'declined',
        text:          `@${me.username} declined your ${reqLabel}`,
        bulletinPost:  notif.bulletinPost || undefined,
        project:       notif.project || undefined,
        read:          false,
      })
    }
  }

  return NextResponse.json({ ok: true, status: notif.status })
}
