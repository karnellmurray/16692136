import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Message from '@/models/Message'
import '@/models/Block'
import { getBlockedIds } from '@/lib/blockCheck'
import mongoose from 'mongoose'

const cdn   = (process.env.AWS_S3_CLOUDFRONT_URL ?? '').replace(/\/$/, '')
const s3    = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

function toUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return (cdn && raw.startsWith(s3)) ? raw.replace(s3, cdn) : raw
  return cdn ? `${cdn}/${raw}` : `${s3}/${raw}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const userId     = new mongoose.Types.ObjectId(session.user.id)
  const blockedIds = await getBlockedIds(session.user.id)
  const blockedOIds = blockedIds.map(id => new mongoose.Types.ObjectId(id))

  // Get the latest message per conversation partner
  const conversations = await Message.aggregate([
    { $match: { $or: [{ sender: userId }, { recipient: userId }], sender: { $nin: blockedOIds }, recipient: { $nin: blockedOIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ['$sender', userId] }, '$recipient', '$sender']
        },
        lastMessage: { $first: '$$ROOT' },
        unread: {
          $sum: {
            $cond: [{ $and: [{ $eq: ['$recipient', userId] }, { $eq: ['$read', false] }] }, 1, 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'signups',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    { $sort: { 'lastMessage.createdAt': -1 } }
  ])

  const normalised = conversations.map(c => ({
    ...c,
    user: c.user ? {
      ...c.user,
      avatarUrl: toUrl(c.user.avatar?.url || (typeof c.user.avatar === 'string' ? c.user.avatar : null) || c.user.profileImage || null),
    } : c.user,
  }))

  return NextResponse.json(normalised)
}
