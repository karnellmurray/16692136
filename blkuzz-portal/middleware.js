import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Manual token check instead of next-auth/middleware's withAuth() HOC —
// see admin-portal/middleware.js for the full story: withAuth wired up
// this exact way was silently never invoking its own `authorized`
// callback, letting every request through unauthenticated regardless
// of session state. This checks the token directly instead of relying
// on that wrapper's internal behavior.
export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const signInUrl = req.nextUrl.clone()
    signInUrl.pathname = '/login'
    signInUrl.search = ''
    return NextResponse.redirect(signInUrl)
  }

  const res = NextResponse.next()
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res
}

export const config = {
  matcher: ['/home/:path*', '/admin/:path*'],
}
