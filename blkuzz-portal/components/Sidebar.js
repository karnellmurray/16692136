'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import {
  Rss, FolderOpen, Pin, Mail, MessageSquare,
  Send, Users
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

const NAV = [
  { href: '/home/feed',      label: 'Feed',            icon: Rss },
  { href: '/home/projects',  label: 'Projects',        icon: FolderOpen },
  { href: '/home/collaborate', label: 'Collaborate',   icon: Pin },
  { href: '/home/inbox',     label: 'Inbox',           icon: Mail },
  { href: '/home/groupchat/lobby', label: 'Groupchat', icon: MessageSquare },
  { href: '/home/apply',     label: 'Work with us',    icon: Send },
  { href: '/home/directory', label: 'Directory',       icon: Users },
]

export default function Sidebar() {
  const pathname  = usePathname()
  const { data: session } = useSession()
  const [unread, setUnread]           = useState(0)
  const [unreadInbox, setUnreadInbox] = useState(0)
  const [hasNewCallouts, setHasNewCallouts] = useState(false)
  const [avatarUrl, setAvatarUrl]     = useState(null)
  const [avatarErr, setAvatarErr]     = useState(false)
  const [settingsOpen, setSettingsOpen]   = useState(false)
  const [systemOpen, setSystemOpen]       = useState(false)
  const [privacyOpen, setPrivacyOpen]     = useState(false)
  const [accountOpen, setAccountOpen]     = useState(false)
  const [mobileOpen, setMobileOpen]       = useState(false)
  const settingsRef = useRef(null)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    const fetchNotifs = () => apiFetch('/api/notifications').then(r => r.json()).then(d => setUnread(d.unread ?? 0))
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchInbox = async () => {
      const [msgsRes, notifsRes] = await Promise.all([
        apiFetch('/api/messages'),
        apiFetch('/api/notifications'),
      ])
      const msgs   = msgsRes.ok   ? await msgsRes.json()   : []
      const notifs = notifsRes.ok ? await notifsRes.json() : {}

      const unreadMsgs = Array.isArray(msgs)
        ? msgs.reduce((sum, c) => sum + (c.unread ?? 0), 0)
        : 0

      const pendingRequests = (notifs.notifications ?? []).filter(
        n => n.type === 'collab_request' && n.status === 'pending' && !n.read
      ).length

      setUnreadInbox(unreadMsgs + pendingRequests)
    }
    fetchInbox()
    const interval = setInterval(fetchInbox, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!session) return
    const fetchCallouts = async () => {
      const res = await apiFetch('/api/collaborate')
      const posts = res.ok ? await res.json() : []
      const lastSeen = localStorage.getItem('collaborate:lastSeen')
      const newest = (Array.isArray(posts) ? posts : [])
        .filter(p => p.author?._id !== session.user.id)
        .some(p => !lastSeen || new Date(p.createdAt) > new Date(lastSeen))
      setHasNewCallouts(newest)
    }
    fetchCallouts()
    const interval = setInterval(fetchCallouts, 30000)
    return () => clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (!session) return
    const fetchAvatar = () => apiFetch('/api/profile').then(r => r.json()).then(d => {
      setAvatarUrl(d.avatar?.url || d.profileImage || null)
      setAvatarErr(false)
    })
    fetchAvatar()
    window.addEventListener('blkuzz:avatar-updated', fetchAvatar)
    return () => window.removeEventListener('blkuzz:avatar-updated', fetchAvatar)
  }, [session])

  useEffect(() => {
    const handler = e => { if (settingsRef.current && !settingsRef.current.contains(e.target)) { setSettingsOpen(false); setSystemOpen(false); setPrivacyOpen(false); setAccountOpen(false) } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!session) return
    apiFetch('/api/presence', { method: 'POST' })
    const interval = setInterval(() => apiFetch('/api/presence', { method: 'POST' }), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [session])

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-black border-b border-[#FDC214] z-40 flex items-center px-4">
        <button
          className="sidebar-burger"
          data-open={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen(o => !o)}
        />
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/70 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-screen h-[100dvh] w-60 bg-black border-r border-[#FDC214] flex flex-col z-50 transition-transform duration-300 ease-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* Logo */}
      <div className="flex items-center justify-center" style={{ height: 120 }}>
        <img src="/portal/images/blkuzz-logo.png" alt="Blkuzz" style={{ height: 72, objectFit: 'contain' }} />
      </div>

      {/* Nav */}
      <nav className="sidebar-nav flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[50px] bg-transparent text-sm ${
                active
                  ? 'bg-gold/10 text-gold border-[2px] border-[#FDC214]'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="font-head tracking-[2px] flex-1">{label}</span>
              {href === '/home/feed' && unread > 0 && (
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#D2042D', boxShadow: '0 0 6px 2px rgba(210,4,45,0.5)' }} />
              )}
              {href === '/home/inbox' && unreadInbox > 0 && (
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#D2042D', boxShadow: '0 0 6px 2px rgba(210,4,45,0.5)' }} />
              )}
              {href === '/home/collaborate' && hasNewCallouts && (
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#D2042D', boxShadow: '0 0 6px 2px rgba(210,4,45,0.5)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + Settings */}
      <div className="sidebar-settings-block px-4 py-4 border-t border-white/5 relative" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }} ref={settingsRef}>
        <p className="member-portal-label text-[10px] tracking-widest uppercase mb-3" style={{ color: '#777' }}>Member Portal</p>
        {session?.user && (
          <div className="member-portal-row flex items-center gap-3">
            <Link href="/home/profile/me" className="member-portal-link flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              {avatarUrl && !avatarErr
                ? <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={() => setAvatarErr(true)} />
                : <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-head uppercase flex-shrink-0">
                    {session.user.username?.[0] ?? '?'}
                  </div>
              }
              <div className="min-w-0">
                <p className="font-head truncate" style={{ color: '#FDC214', letterSpacing: '1px', fontSize: 11 }}>@{session.user.username}</p>
                <p className="text-[10px] truncate text-white">{session.user.email}</p>
              </div>
            </Link>
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              title="Settings"
            >
              <img src="/portal/icons/setting-y.png" alt="Settings" style={{ width: 16, height: 16, objectFit: 'contain' }} />
            </button>
          </div>
        )}

        {/* Settings panel */}
        {settingsOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 12, right: 12, marginBottom: 8,
            background: '#111', border: '1px solid #222', zIndex: 100,
          }}>
            {/* Header */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.25em', color: '#777', textTransform: 'uppercase' }}>Settings</div>
            </div>

            {/* Profile */}
            <div style={{ padding: '6px 14px 2px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 6, letterSpacing: '0.25em', color: '#777', textTransform: 'uppercase' }}>Profile</div>
            <Link href="/home/profile/edit" onClick={() => setSettingsOpen(false)}
              style={{ display: 'block', padding: '9px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: '#777', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid #1a1a1a' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FDC214'}
              onMouseLeave={e => e.currentTarget.style.color = '#777'}
            >
              Edit profile
            </Link>

            {/* Sign out */}
            <button
              onClick={async () => { await apiFetch('/api/presence', { method: 'DELETE' }); signOut({ callbackUrl: '/portal/login' }) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: '#777', textTransform: 'uppercase', background: 'none', border: 'none', borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#777'}
            >
              Sign out
            </button>

            {/* System tab */}
            <button
              onClick={() => setSystemOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '9px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: '#777', textTransform: 'uppercase', background: 'none', border: 'none', borderTop: '1px solid #1a1a1a', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#888'}
              onMouseLeave={e => e.currentTarget.style.color = '#777'}
            >
              <span>System</span>
              <span style={{ fontSize: 8, opacity: 0.4 }}>{systemOpen ? '▲' : '▼'}</span>
            </button>

            {systemOpen && (
              <div style={{ background: '#0d0d0d', borderTop: '1px solid #1a1a1a' }}>

                {/* Privacy */}
                <button
                  onClick={() => setPrivacyOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '8px 14px 8px 20px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', color: '#777', textTransform: 'uppercase', background: 'none', border: 'none', borderBottom: '1px solid #141414', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#888'}
                  onMouseLeave={e => e.currentTarget.style.color = '#777'}
                >
                  <span>Privacy</span>
                  <span style={{ fontSize: 7, opacity: 0.4 }}>{privacyOpen ? '▲' : '▼'}</span>
                </button>
                {privacyOpen && (
                  <Link href="/home/settings/blocked" onClick={() => setSettingsOpen(false)}
                    style={{ display: 'block', padding: '8px 14px 8px 26px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: '#777', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid #141414' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#FDC214'}
                    onMouseLeave={e => e.currentTarget.style.color = '#777'}
                  >
                    Blocked members
                  </Link>
                )}

                {/* Account */}
                <button
                  onClick={() => setAccountOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '8px 14px 8px 20px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', color: '#777', textTransform: 'uppercase', background: 'none', border: 'none', borderBottom: accountOpen ? '1px solid #141414' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#888'}
                  onMouseLeave={e => e.currentTarget.style.color = '#777'}
                >
                  <span>Account</span>
                  <span style={{ fontSize: 7, opacity: 0.4 }}>{accountOpen ? '▲' : '▼'}</span>
                </button>
                {accountOpen && (
                  <button
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px 8px 26px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: '#ff444450', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#ff444450'}
                  >
                    Delete account
                  </button>
                )}

                {/* Report Bugs */}
                <Link href="/home/settings/report" onClick={() => setSettingsOpen(false)}
                  style={{ display: 'block', padding: '8px 14px 8px 20px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', color: '#777', textTransform: 'uppercase', textDecoration: 'none', borderTop: '1px solid #141414' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#FDC214'}
                  onMouseLeave={e => e.currentTarget.style.color = '#777'}
                >
                  Report Bugs
                </Link>

              </div>
            )}
          </div>
        )}
      </div>

    </aside>
    </>
  )
}
