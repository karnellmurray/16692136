import CredentialsProvider from 'next-auth/providers/credentials'

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
        if (credentials?.password !== secret) return null
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
