import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) throw new Error('Missing MONGODB_URI in .env.local')

let cached = global.mongoose
if (!cached) cached = global.mongoose = { conn: null, promise: null }

export async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn
  if (mongoose.connection.readyState !== 1) {
    cached.conn    = null
    cached.promise = null
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false })
  }
  cached.conn = await cached.promise
  return cached.conn
}

export default connectDB
