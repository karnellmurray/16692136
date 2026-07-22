import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import connectDB from '@/lib/mongodb'
import Config from '@/models/Config'

const DEFAULTS = {
  slotsRemaining: 1,
  currentQuarter: 'Q3',
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const keys = Object.keys(DEFAULTS)
  const docs  = await Config.find({ key: { $in: keys } }).lean()

  const result = { ...DEFAULTS }
  for (const d of docs) result[d.key] = d.value

  return NextResponse.json(result)
}
