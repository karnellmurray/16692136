import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/home/feed')
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' }}>
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.25em', color: '#FDC214' }}>BLKUZZ ADMIN</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#333' }}>·</span>
        <a href="/admin/reports" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', color: '#555', textDecoration: 'none' }}>REPORTS</a>
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  )
}
