import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

// The dashboard page is a client component ('use client'), so it can't
// call getServerSession() itself, and middleware.js was found to not
// actually be gating this route (see investigation — the authorized
// callback never fires despite the matcher/pathname looking correct,
// likely a custom-server + basePath interaction). This layout is a
// server component, giving /dashboard a real server-side auth check
// independent of both middleware and client-side JS.
export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return children
}
