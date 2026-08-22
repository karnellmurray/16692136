import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Manual token check instead of next-auth/middleware's withAuth() HOC —
// withAuth wired up identically to blkuzz-portal's (which is meant to
// work the same way) was silently never invoking its own `authorized`
// callback here, letting every request through unauthenticated. Rather
// than depend on that wrapper's internal behavior, this checks the
// token directly and redirects itself.
export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const signInUrl = req.nextUrl.clone()
    signInUrl.pathname = '/login'
    signInUrl.search = ''
    return NextResponse.redirect(signInUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/stats/:path*', '/api/members/:path*', '/api/pitches/:path*', '/api/analytics/:path*', '/api/broadcast/:path*'],
}
