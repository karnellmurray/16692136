import mongoose from 'mongoose'

let cached = global.mongoose
if (!cached) cached = global.mongoose = { conn: null, promise: null }

export async function connectDB() {
  if (cached.conn) return cached.conn
  if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI in .env.local')
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false })
  }
  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    throw err
  }
  return cached.conn
}

export default connectDB
