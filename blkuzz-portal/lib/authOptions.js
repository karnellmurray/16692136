import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'
import Notification from '@/models/Notification'
import { isRateLimited, recordAttempt } from '@/lib/rateLimit'

const LOGIN_MAX_FAILURES = 5
const LOGIN_WINDOW_MS    = 15 * 60 * 1000

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username or Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        await connectDB()
        const identifier   = credentials.username.trim().toLowerCase()
        const rateLimitKey = `login:${identifier}`

        if (await isRateLimited(rateLimitKey, { max: LOGIN_MAX_FAILURES, windowMs: LOGIN_WINDOW_MS })) {
          throw new Error('Too many failed login attempts. Please wait 15 minutes and try again.')
        }

        const user = await Signup.findOne({
          $or: [{ username: identifier }, { email: identifier }]
        })

        if (!user) {
          await recordAttempt(rateLimitKey, false)
          return null
        }
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        await recordAttempt(rateLimitKey, valid)
        if (!valid) return null

        await Signup.findByIdAndUpdate(user._id, { lastActiveAt: new Date(), isOnline: true })

        if (!user.onboarded) {
          await Signup.findByIdAndUpdate(user._id, { onboarded: true })
          const missingPhoto = !user.profileImage && !user.avatar?.url
          const missingBio   = !user.bio
          if (missingPhoto || missingBio) {
            try {
              const notifs = []
              if (missingPhoto) notifs.push({ user: user._id, type: 'system', text: 'Upload a profile picture', link: '/home/profile/edit' })
              if (missingBio)   notifs.push({ user: user._id, type: 'system', text: 'Update your bio', link: '/home/profile/edit' })
              await Notification.insertMany(notifs)
            } catch (err) {
              console.error('Failed to create onboarding notifications:', err)
            }
          }
        }

        return {
          id:       user._id.toString(),
          username: user.username,
          email:    user.email,
          role:     user.role ?? 'member',
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.username = user.username; token.id = user.id; token.role = user.role }
      return token
    },
    async session({ session, token }) {
      session.user.username = token.username
      session.user.id       = token.id ?? token.sub
      session.user.role     = token.role ?? 'member'
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
