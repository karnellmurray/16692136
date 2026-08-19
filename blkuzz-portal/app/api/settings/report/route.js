import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import { sendBugReportEmail } from '@/lib/resend'
import { isRateLimited, recordAttempt } from '@/lib/rateLimit'

const RATE_LIMIT_MAX       = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const MAX_DESCRIPTION_LEN  = 5000
const MAX_SUBJECT_LEN      = 200

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, description } = await req.json()
  if (!subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Subject and description are required.' }, { status: 400 })
  }
  if (description.length > MAX_DESCRIPTION_LEN) {
    return NextResponse.json({ error: 'Description is too long.' }, { status: 400 })
  }

  const rateLimitKey = `bugreport:${session.user.id}`
  if (await isRateLimited(rateLimitKey, { max: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS })) {
    return NextResponse.json({ error: 'Too many reports submitted. Please wait a while before submitting another.' }, { status: 429 })
  }
  await recordAttempt(rateLimitKey)

  await connectDB()
  const me = await Signup.findById(session.user.id, 'username email').lean()

  try {
    await sendBugReportEmail({
      fromUsername: me?.username ?? session.user.username ?? 'unknown',
      fromEmail:    me?.email ?? '',
      subject:      subject.trim().slice(0, MAX_SUBJECT_LEN),
      description:  description.trim(),
    })
  } catch (err) {
    console.error('[settings/report] failed to send email:', err)
    return NextResponse.json({ error: 'Failed to send report. Please try again later.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
