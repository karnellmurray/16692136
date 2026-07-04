export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/api/stats/:path*', '/api/members/:path*', '/api/pitches/:path*', '/api/analytics/:path*'],
}
