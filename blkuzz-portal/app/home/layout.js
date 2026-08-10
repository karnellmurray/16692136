import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

// middleware.js is supposed to gate everything under /home, but was
// found to not actually redirect unauthenticated requests (same issue
// found in admin-portal — likely a custom-server + basePath
// interaction with next-auth's middleware). admin/layout.js already
// has its own server-side session check for exactly this reason; this
// mirrors that pattern so every /home/* route gets a real guard
// independent of the middleware.
export default async function HomeLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <main className="lg:ml-60 flex-1 min-h-screen p-8 pt-20 lg:pt-8">
        {children}
      </main>
    </div>
  )
}
