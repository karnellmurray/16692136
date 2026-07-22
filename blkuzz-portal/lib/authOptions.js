import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/mongodb'
import Signup from '@/models/Signup'

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
        const identifier = credentials.username.trim().toLowerCase()

        const user = await Signup.findOne({
          $or: [{ username: identifier }, { email: identifier }]
        })

        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        await Signup.findByIdAndUpdate(user._id, { lastActiveAt: new Date(), isOnline: true })

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
