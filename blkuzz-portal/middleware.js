import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const res = NextResponse.next()
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/home/:path*', '/admin/:path*'],
}
