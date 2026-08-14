import connectDB from '@/lib/mongodb'
import RateLimitEvent from '@/models/RateLimitEvent'

// Counts recent failed/attempted events for `key` within `windowMs` and
// reports whether the caller is currently locked out. Scoped per-key
// (e.g. per-account, per-email) rather than globally, so one attacker
// can't lock out unrelated users by deliberately failing repeatedly.
export async function isRateLimited(key, { max, windowMs }) {
  await connectDB()
  const windowStart = new Date(Date.now() - windowMs)
  const count = await RateLimitEvent.countDocuments({ key, createdAt: { $gt: windowStart } })
  return count >= max
}

export async function recordAttempt(key, success = false) {
  await connectDB()
  await RateLimitEvent.create({ key, success })
}
