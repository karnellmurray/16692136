import Block from '@/models/Block'
import mongoose from 'mongoose'

function toId(v) {
  return typeof v === 'string' ? new mongoose.Types.ObjectId(v) : v
}

export async function isBlocked(userA, userB) {
  const a = toId(userA)
  const b = toId(userB)
  return !!(await Block.findOne({
    $or: [{ blockedBy: a, blocked: b }, { blockedBy: b, blocked: a }],
  }).lean())
}

export async function getBlockedIds(userId) {
  const id  = toId(userId)
  const str = userId.toString()
  const blocks = await Block.find({
    $or: [{ blockedBy: id }, { blocked: id }],
  }).lean()
  return blocks.map(b =>
    b.blockedBy.toString() === str ? b.blocked.toString() : b.blockedBy.toString()
  )
}
