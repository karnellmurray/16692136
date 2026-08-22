import CredentialsProvider from 'next-auth/providers/credentials'
import connectDB from '@/lib/mongodb'
import LoginAttempt from '@/models/LoginAttempt'

const MAX_FAILURES        = 5
const LOCKOUT_WINDOW_MS   = 15 * 60 * 1000

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const secret = process.env.ADMIN_SECRET
        if (!secret) throw new Error('ADMIN_SECRET not configured')

        await connectDB()
        const windowStart    = new Date(Date.now() - LOCKOUT_WINDOW_MS)
        const recentFailures = await LoginAttempt.countDocuments({ success: false, createdAt: { $gt: windowStart } })
        if (recentFailures >= MAX_FAILURES) {
          throw new Error('Too many failed login attempts. Please wait 15 minutes and try again.')
        }

        const valid = credentials?.password === secret
        await LoginAttempt.create({ success: valid })
        if (!valid) return null
        return { id: 'admin', name: 'Blkuzz Admin', role: 'admin' }
      },
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
