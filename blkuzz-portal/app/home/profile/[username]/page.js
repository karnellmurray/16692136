'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { Share2, MoreVertical, Edit, ExternalLink } from 'lucide-react'

const GOLD = '#FDC214'
const GREEN = '#008000'
const RED   = '#D2042D'
const MONO  = 'IBM Plex Mono, monospace'
const SANS  = 'Space Grotesk, sans-serif'

const PROJ_COLORS = ['#00aaff', '#00ff88', '#FDC214', '#ff6644', '#cc44ff', '#e8ff00']
function projColor(str = '') {
  let h = 0
  for (const c of str) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return PROJ_COLORS[Math.abs(h) % PROJ_COLORS.length]
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  if (s < 2629800) return `${Math.floor(s / 604800)}w ago`
  if (s < 31557600) return `${Math.floor(s / 2629800)}mo ago`
  return `${Math.floor(s / 31557600)}y ago`
}

function memberSince(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function initials(name, username) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return (username || '').slice(0, 2).toUpperCase() || '??'
}

function agentNum(id) {
  if (!id) return '0000'
  const hex = String(id).slice(-6)
  const n   = parseInt(hex, 16) % 9999 + 1
  return String(n).padStart(4, '0')
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em', color: '#777', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
      <div style={{ flex: 1, height: 1, background: '#141414' }} />
    </div>
  )
}

function IdPhoto({ avatarUrl, name, username }) {
  const [imgError, setImgError] = useState(false)
  useEffect(() => { setImgError(false) }, [avatarUrl])
  const inits = initials(name, username)

  return (
    <div style={{ width: 108, height: 130, flexShrink: 0, position: 'relative', overflow: 'hidden', background: '#0d0d0d' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${GREEN}06 1px, transparent 1px), linear-gradient(90deg, ${GREEN}06 1px, transparent 1px)`, backgroundSize: '10px 10px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {(!avatarUrl || imgError) && <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: `${GREEN}40`, position: 'relative', zIndex: 1 }}>{inits}</span>}
        {avatarUrl && !imgError && <img src={avatarUrl} alt="" onError={() => setImgError(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      <div className="pf-scanline" style={{ position: 'absolute', left: 0, right: 0, height: 2, background: `${GREEN}25`, zIndex: 2 }} />
      <div style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 8, borderTop: `1px solid ${GREEN}40`, borderLeft: `1px solid ${GREEN}40`, zIndex: 3 }} />
      <div style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderTop: `1px solid ${GREEN}40`, borderRight: `1px solid ${GREEN}40`, zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: 3, left: 3, width: 8, height: 8, borderBottom: `1px solid ${GREEN}40`, borderLeft: `1px solid ${GREEN}40`, zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: 3, right: 3, width: 8, height: 8, borderBottom: `1px solid ${GREEN}40`, borderRight: `1px solid ${GREEN}40`, zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#00000080', fontFamily: MONO, fontSize: 7, letterSpacing: '0.15em', color: GREEN, textAlign: 'center', padding: '2px 0', textTransform: 'uppercase', zIndex: 3 }}>ID Photo</div>
    </div>
  )
}

function Barcode({ seed = '' }) {
  const bars = Array.from({ length: 22 }, (_, i) => {
    const c = (seed.charCodeAt(i % Math.max(seed.length, 1)) || 65) + i * 7
    return { w: (c % 2) + 1, h: (c % 13) + 7 }
  })
  return (
    <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 20 }}>
      {bars.map((b, i) => <div key={i} style={{ width: b.w, height: b.h, background: '#1e1e1e' }} />)}
    </div>
  )
}

function CollabAvatar({ creator, size = 28, color }) {
  const url = creator?.avatarUrl ?? null
  const [imgError, setImgError] = useState(false)
  useEffect(() => { setImgError(false) }, [url])
  const inits = initials(creator?.name, creator?.username)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {(!url || imgError) && <span style={{ fontFamily: MONO, fontSize: size * 0.3, fontWeight: 700, color: `${color}70` }}>{inits}</span>}
      {url && !imgError && <img src={url} alt="" onError={() => setImgError(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
    </div>
  )
}

function ProjectRow({ project }) {
  const color             = projColor(project.title)
  const completedChapters = project.chapters?.filter(c => c.status === 'done').length ?? 0
  const totalChapters     = project.chapters?.length ?? 0

  return (
    <Link href={`/home/projects/${project.slug}`} style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid #0f0f0f', alignItems: 'center', textDecoration: 'none' }}>
      <div style={{ width: 3, height: 44, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 7, color, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>
          {project.disciplines?.length > 0 ? project.disciplines.slice(0, 3).join(' · ') : 'Project'}
        </div>
        <div className="font-head" style={{ fontSize: 14, color: GOLD, letterSpacing: '2px', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.title}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, color: '#fff' }}>{project.followers?.length ?? project.followerCount ?? 0} followers</span>
          {project.updatedAt && <span style={{ fontFamily: MONO, fontSize: 8, color: '#fff' }}>{timeAgo(project.updatedAt)}</span>}
          <span style={{ fontFamily: MONO, fontSize: 8, color: project.status === 'active' ? GREEN : '#777', textTransform: 'uppercase' }}>{project.status}</span>
        </div>
      </div>
      <div style={{ width: 54, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color }}>{project.progress ?? 0}%</span>
        <div style={{ width: '100%', height: 2, background: '#1a1a1a', borderRadius: 1 }}>
          <div style={{ height: '100%', width: `${project.progress ?? 0}%`, background: color, borderRadius: 1 }} />
        </div>
      </div>
    </Link>
  )
}

const TABS = ['bio', 'projects', 'collabs', 'media', 'activity']

export default function ProfilePage() {
  const { username }      = useParams()
  const { data: session } = useSession()
  const router            = useRouter()

  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [tab, setTab]                 = useState('bio')
  const [following, setFollowing]     = useState(false)
  const [followBusy, setFollowBusy]   = useState(false)
  const [collabStatus, setCollabStatus] = useState('none')
  const [collabBusy, setCollabBusy]   = useState(false)
  const [dotsOpen, setDotsOpen]         = useState(false)
  const [dotsConfirm, setDotsConfirm]   = useState(null) // 'block' | 'block-report'
  const dotsRef                         = useRef(null)
  const [shareOpen, setShareOpen]       = useState(false)
  const [shareQuery, setShareQuery]     = useState('')
  const [shareMembers, setShareMembers] = useState([])
  const [shareSent, setShareSent]       = useState(new Set())
  const [shareSending, setShareSending] = useState(new Set())
  const shareRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setCollabStatus('none')
    apiFetch(`/api/profile/${username}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setData(d)
        setFollowing(d.isFollowing)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [username])

  useEffect(() => {
    if (!data?.user?._id || data.isOwnProfile) return
    apiFetch(`/api/collab?to=${data.user._id}`)
      .then(r => r.json())
      .then(d => setCollabStatus(d.status ?? 'none'))
      .catch(() => {})
  }, [data?.user?._id])

  const sendCollab = async () => {
    if (collabBusy || collabStatus === 'pending') return
    setCollabBusy(true)
    try {
      const res  = await apiFetch('/api/collab', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: data.user._id }),
      })
      const json = await res.json()
      setCollabStatus(json.status)
    } finally {
      setCollabBusy(false)
    }
  }

  const toggleFollow = async () => {
    setFollowBusy(true)
    try {
      const res  = await apiFetch(`/api/profile/${username}/follow`, { method: 'POST' })
      const json = await res.json()
      setFollowing(json.following)
      setData(d => d ? { ...d, stats: { ...d.stats, followers: d.stats.followers + (json.following ? 1 : -1) } } : d)
    } finally {
      setFollowBusy(false)
    }
  }

  useEffect(() => {
    if (!dotsOpen) return
    const handler = e => { if (dotsRef.current && !dotsRef.current.contains(e.target)) setDotsOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dotsOpen])

  const executeBlock = async (withReport) => {
    setDotsConfirm(null)
    await apiFetch('/api/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?._id, report: withReport }),
    })
    router.push('/home/directory')
  }

  useEffect(() => {
    if (!shareOpen || shareMembers.length > 0) return
    apiFetch('/api/directory').then(r => r.json()).then(d => setShareMembers(Array.isArray(d) ? d : [])).catch(() => {})
  }, [shareOpen])

  useEffect(() => {
    if (!shareOpen) return
    const handler = e => { if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [shareOpen])

  const handleShareSend = async (memberId) => {
    if (shareSent.has(memberId) || shareSending.has(memberId)) return
    setShareSending(s => new Set([...s, memberId]))
    try {
      const profileUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/portal/home/profile/${user?.username}`
        : `/home/profile/${user?.username}`
      await apiFetch(`/api/messages/${memberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: profileUrl }),
      })
      setShareSent(s => new Set([...s, memberId]))
    } catch {}
    setShareSending(s => { const n = new Set(s); n.delete(memberId); return n })
  }

  if (loading) return (
    <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', fontFamily: MONO, fontSize: 9, color: '#777', letterSpacing: '0.25em' }}>
      LOADING...
    </div>
  )

  if (notFound) return (
    <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', fontFamily: MONO, fontSize: 9, color: '#777', letterSpacing: '0.25em' }}>
      MEMBER FILE NOT FOUND
    </div>
  )

  if (data?.isBlocked) return (
    <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', fontFamily: MONO, fontSize: 9, color: '#777', letterSpacing: '0.25em' }}>
      THIS PROFILE IS NOT AVAILABLE
    </div>
  )

  const { user, projects = [], collabs = [], stats = {}, media = [], activity = [] } = data ?? {}
  const isOwn    = data?.isOwnProfile
  const blkuzzId = user?.blkuzzId || `BLK-${agentNum(user?._id)}`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pf-scan { 0%{top:0;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        .pf-scanline { animation: pf-scan 3s ease-in-out infinite; }
        .share-search::placeholder { color: #FDC214; opacity: 0.5; }
      `}} />

      <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#e8e8e8', fontFamily: SANS, overflow: 'hidden' }}>

        {/* Spacer */}
        <div style={{ height: 16, background: '#0a0a0a', flexShrink: 0 }} />

        {/* Classified band */}
        <div style={{ background: RED, padding: '4px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.35em', color: '#fff', textTransform: 'uppercase' }}>Member file — restricted access</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#fff', letterSpacing: '0.1em' }}>FILE #{blkuzzId}</div>
        </div>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
          <span className="font-head" style={{ fontSize: 15, letterSpacing: '2px', color: GOLD }}>BLKUZZ</span>
          <div style={{ display: 'flex', gap: 14 }}>
            <img src="/portal/icons/share-y.png" alt="Share" onClick={() => { setShareOpen(true); setShareQuery('') }} style={{ width: 17, height: 17, objectFit: 'contain', cursor: 'pointer' }} />
            {!isOwn && (
              <div ref={dotsRef} style={{ position: 'relative' }}>
                <MoreVertical size={17} onClick={() => setDotsOpen(o => !o)} style={{ color: '#FDC214', cursor: 'pointer' }} />
                {dotsOpen && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, background: '#0d0d0d', border: '1px solid #1e1e1e', zIndex: 100, minWidth: 160 }}>
                    <button onClick={() => { setDotsOpen(false); setDotsConfirm('block') }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #1a1a1a', fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: '#777', textTransform: 'uppercase', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={e => e.currentTarget.style.color = '#777'}
                    >Block</button>
                    <button onClick={() => { setDotsOpen(false); setDotsConfirm('block-report') }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: '#D2042D', textTransform: 'uppercase', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ff6666'}
                      onMouseLeave={e => e.currentTarget.style.color = '#D2042D'}
                    >Block & Report</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable area */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

          {/* Dossier header */}
          <div style={{ padding: 16, borderBottom: '1px solid #141414', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 28px, #ffffff03 28px, #ffffff03 29px)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', gap: 14, marginBottom: 14, position: 'relative' }}>
              <IdPhoto avatarUrl={user.avatarUrl} name={user.name} username={user.username} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: '#fff', textTransform: 'uppercase', marginBottom: 5 }}>
                  {blkuzzId}{user.location ? ` · ${user.location}` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                  <div className="font-head" style={{ fontSize: 27, letterSpacing: '2px', color: GOLD, lineHeight: 1 }}>
                    {user.name || user.username}
                  </div>
                  {!isOwn && (
                    collabStatus === 'accepted'
                      ? <Link href={`/home/inbox?with=${user._id}`}
                          style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', padding: '8px 16px', border: `1px solid ${GREEN}`, color: GREEN, background: 'transparent', textTransform: 'uppercase', textDecoration: 'none', flexShrink: 0 }}>
                          Message
                        </Link>
                      : <button
                          onClick={sendCollab}
                          disabled={collabStatus === 'pending' || collabBusy}
                          style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.12em', padding: '10px 20px', border: collabStatus === 'pending' ? '1px solid #777' : `1px solid ${GOLD}`, color: collabStatus === 'pending' ? '#777' : GOLD, background: 'transparent', cursor: collabStatus === 'pending' ? 'default' : 'pointer', textTransform: 'uppercase', outline: 'none', flexShrink: 0 }}>
                          {collabStatus === 'pending' ? 'Requested' : 'Collab'}
                        </button>
                  )}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: '#fff', marginBottom: 10 }}>@{user.username}</div>
                {user.discipline && (
                  <div style={{ display: 'inline-block', fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', padding: '3px 9px', border: `1px solid ${GREEN}`, color: GREEN, textTransform: 'uppercase', marginBottom: 10 }}>
                    {user.discipline}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', color: '#777', textTransform: 'uppercase' }}>Status</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: GREEN }}>✓ Active</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', color: '#777', textTransform: 'uppercase' }}>Since</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: GREEN }}>{memberSince(user.createdAt)}</span>
                  </div>
                  {user.location && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', gridColumn: '1 / -1' }}>
                      <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', color: '#777', textTransform: 'uppercase' }}>Base</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {user.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, position: 'relative' }}>
                {user.tags.map((tag, i) => (
                  <span key={i} className="font-head" style={{ fontSize: 9, letterSpacing: '2px', padding: '4px 12px', border: `1px solid ${GOLD}`, color: GOLD, textTransform: 'uppercase', borderRadius: 9999 }}>{tag}</span>
                ))}
              </div>
            )}

            {/* Actions — own profile only */}
            {isOwn && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, position: 'relative' }}>
                <Link href="/home/profile/edit" style={{ flex: 1, fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', padding: 11, border: `1px solid ${GOLD}`, color: GOLD, background: 'transparent', textTransform: 'uppercase', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Edit size={12} /> Edit Profile
                </Link>
              </div>
            )}

          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #141414' }}>
            {[
              { num: stats.projects  ?? 0, label: 'Projects',  color: '#ccc' },
              { num: stats.callouts  ?? 0, label: 'Callouts',  color: '#ccc' },
              { num: stats.collabs   ?? 0, label: 'Collabs',   color: GOLD },
            ].map((s, i, arr) => (
              <div key={i} style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderRight: i < arr.length - 1 ? '1px solid #141414' : 'none' }}>
                <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', color: s.color, lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', color: '#777', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #141414', overflowX: 'auto', scrollbarWidth: 'none', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', padding: '12px 16px', color: tab === t ? GOLD : '#444', cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap', background: 'transparent', border: 'none', outline: 'none', borderBottom: tab === t ? `2px solid ${GOLD}` : '2px solid transparent' }}>
                {t}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: '14px 16px 56px' }}>

            {/* ── BIO ── */}
            {tab === 'bio' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, marginBottom: 20 }}>

                  {/* Profile / Bio */}
                  <div>
                    <SectionLabel>Profile</SectionLabel>
                    {user.bio
                      ? <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.65, marginBottom: 12 }}>{user.bio}</div>
                      : <div style={{ fontFamily: MONO, fontSize: 9, color: '#777' }}>No bio on file.</div>
                    }
                    {user.links?.portfolio && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        <a href={user.links.portfolio} target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', padding: '4px 9px', border: '1px solid #1e1e1e', color: '#777', textTransform: 'uppercase', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ExternalLink size={9} /> Website
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  <div>
                    <SectionLabel>Skills</SectionLabel>
                    {user.skills?.length > 0
                      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {user.skills.map((s, i) => (
                            <span key={i} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', padding: '6px 13px', border: '1px solid #FDC214', color: '#FDC214', textTransform: 'uppercase', borderRadius: 9999 }}>{s}</span>
                          ))}
                        </div>
                      : <div style={{ fontFamily: MONO, fontSize: 9, color: '#777', textAlign: 'center' }}>No skills on file.</div>
                    }
                  </div>

                </div>

                {(projects.filter(p => p.status === 'active').length > 0 || collabs.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16, marginBottom: 20 }}>

                    {/* Active projects */}
                    <div>
                      <SectionLabel>Active projects</SectionLabel>
                      {projects.filter(p => p.status === 'active').length === 0
                        ? <div style={{ fontFamily: MONO, fontSize: 9, color: '#777', textAlign: 'center' }}>None on file.</div>
                        : projects.filter(p => p.status === 'active').slice(0, 3).map(p => <ProjectRow key={p._id} project={p} />)
                      }
                    </div>

                    {/* Collaborations */}
                    <div>
                      <SectionLabel>Collaborations</SectionLabel>
                      {collabs.length === 0
                        ? <div style={{ fontFamily: MONO, fontSize: 9, color: '#777', textAlign: 'center' }}>None on file.</div>
                        : collabs.slice(0, 3).map(c => {
                            const color = projColor(c.title)
                            return (
                              <Link key={c._id} href={`/home/projects/${c.slug}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #0f0f0f', textDecoration: 'none' }}>
                                <CollabAvatar creator={c.creator} size={34} color={color} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, color: GOLD, letterSpacing: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="font-head">{c.title}</div>
                                  <div style={{ fontFamily: MONO, fontSize: 8, color: '#fff' }}>{c.role || 'Collaborator'} <span style={{ color: '#00aaff' }}>@{c.creator?.username}</span></div>
                                </div>
                                <div style={{ fontFamily: MONO, fontSize: 8, color: c.status === 'active' ? GREEN : '#777', textTransform: 'uppercase', flexShrink: 0 }}>{c.status}</div>
                              </Link>
                            )
                          })
                      }
                    </div>

                  </div>
                )}
              </>
            )}

            {/* ── PROJECTS ── */}
            {tab === 'projects' && (
              <div>
                <SectionLabel>All projects ({projects.length})</SectionLabel>
                {projects.length === 0
                  ? <div style={{ fontFamily: MONO, fontSize: 9, color: '#777', textAlign: 'center' }}>No projects on file.</div>
                  : projects.map(p => <ProjectRow key={p._id} project={p} />)
                }
              </div>
            )}

            {/* ── COLLABS ── */}
            {tab === 'collabs' && (
              <div>
                <SectionLabel>Collaboration history ({collabs.length})</SectionLabel>
                {collabs.length === 0
                  ? <div style={{ fontFamily: MONO, fontSize: 9, color: '#777', textAlign: 'center' }}>No collaborations on file.</div>
                  : collabs.map(c => {
                      const color = projColor(c.title)
                      return (
                        <Link key={c._id} href={`/home/projects/${c.slug}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid #0f0f0f', textDecoration: 'none' }}>
                          <CollabAvatar creator={c.creator} size={38} color={color} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, color: GOLD, letterSpacing: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="font-head">{c.title}</div>
                            <div style={{ fontFamily: MONO, fontSize: 8, color: '#fff', marginTop: 3 }}>{c.role || 'Collaborator'} <span style={{ color: '#00aaff' }}>@{c.creator?.username}</span></div>
                            {c.disciplines?.length > 0 && <div style={{ fontFamily: MONO, fontSize: 7, color: GOLD, textTransform: 'uppercase', marginTop: 3 }}>{c.disciplines.join(' · ')}</div>}
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            <div style={{ fontFamily: MONO, fontSize: 8, color: c.status === 'active' ? GREEN : color, textTransform: 'uppercase' }}>{c.status}</div>
                            {c.updatedAt && <div style={{ fontFamily: MONO, fontSize: 7, color: '#777', marginTop: 3 }}>{timeAgo(c.updatedAt)}</div>}
                          </div>
                        </Link>
                      )
                    })
                }
              </div>
            )}

            {/* ── MEDIA ── */}
            {tab === 'media' && (
              <div>
                <SectionLabel>Media</SectionLabel>
                {media.length === 0
                  ? <div style={{ fontFamily: MONO, fontSize: 9, color: '#777', textAlign: 'center' }}>No media on file.</div>
                  : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                      {media.flatMap(post =>
                        (post.media || []).map((url, i) => (
                          <Link key={`${post._id}-${i}`} href={`/home/projects/${post.project?.slug ?? ''}`}
                            style={{ aspectRatio: '1', display: 'block', overflow: 'hidden', background: '#0d0d0d', textDecoration: 'none' }}>
                            {/\.(mp4|webm|mov)$/i.test(url)
                              ? <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                              : <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            }
                          </Link>
                        ))
                      )}
                    </div>
                  )
                }
              </div>
            )}

            {/* ── ACTIVITY ── */}
            {tab === 'activity' && (
              <div>
                <SectionLabel>Recent activity</SectionLabel>
                {activity.length === 0
                  ? <div style={{ fontFamily: MONO, fontSize: 9, color: '#777', textAlign: 'center' }}>No activity on file.</div>
                  : activity.map((post, i) => (
                    <div key={post._id ?? i} style={{ display: 'flex', gap: 10, padding: '11px 0', borderBottom: '1px solid #0f0f0f', alignItems: 'flex-start' }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0, marginTop: 8 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#777', lineHeight: 1.4 }}>
                          Posted {post.type === 'milestone' ? 'a milestone' : post.type === 'media' ? 'media' : 'an update'} to{' '}
                          {post.project
                            ? <Link href={`/home/projects/${post.project.slug}`} className="font-head" style={{ color: GOLD, textDecoration: 'none', letterSpacing: '2px' }}>{post.project.title}</Link>
                            : 'a project'
                          }
                        </div>
                        {post.content && (
                          <div style={{ fontFamily: MONO, fontSize: 9, color: '#fff', marginTop: 5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {post.content}
                          </div>
                        )}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 8, color: '#777', flexShrink: 0, marginTop: 1 }}>
                        {timeAgo(post.createdAt)}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

          </div>
        </div>
      </div>
      {/* Block confirmation modal */}
      {dotsConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 320, background: '#0d0d0d', border: '1px solid #1e1e1e', padding: '24px 20px' }}>
            <div className="font-head" style={{ fontSize: 13, color: '#fff', letterSpacing: '2px', marginBottom: 8 }}>
              {dotsConfirm === 'block' ? 'Block' : 'Block & Report'} <span style={{ color: GOLD }}>@{user?.username}?</span>
            </div>
            <p style={{ fontFamily: MONO, fontSize: 9, color: '#777', lineHeight: 1.7, marginBottom: 24, letterSpacing: '0.05em' }}>
              {dotsConfirm === 'block'
                ? 'They will no longer be able to message you or see your profile.'
                : 'This member will be blocked and reported to the Blkuzz team for review.'
              }
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDotsConfirm(null)}
                style={{ flex: 1, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 0', background: 'none', border: '1px solid #2a2a2a', color: '#777', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => executeBlock(dotsConfirm === 'block-report')}
                style={{ flex: 1, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 0', background: dotsConfirm === 'block-report' ? '#D2042D' : '#fff', border: 'none', color: '#000', cursor: 'pointer' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {shareOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div ref={shareRef} style={{ width: 320, background: 'transparent', border: `1px solid ${GOLD}`, display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>

            {/* Header */}
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div className="font-head" style={{ fontSize: 13, letterSpacing: '2px', color: GOLD }}>Share profile</div>
              <button onClick={() => setShareOpen(false)} style={{ position: 'absolute', right: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                <img src="/portal/icons/cross-y.png" alt="Close" style={{ width: 12, height: 12, objectFit: 'contain' }} />
              </button>
            </div>

            {/* Profile being shared */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #111', fontFamily: MONO, fontSize: 8, color: '#777', letterSpacing: '0.1em' }}>
              Sharing <span style={{ color: '#777' }}>@{user?.username}</span>&apos;s member file
            </div>

            {/* Search */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #111' }}>
              <input
                autoFocus
                value={shareQuery}
                onChange={e => setShareQuery(e.target.value)}
                placeholder="Search members..."
                className="share-search"
                style={{ width: '100%', background: 'transparent', border: `1px solid ${GOLD}`, color: '#e8e8e8', fontFamily: MONO, fontSize: 9, padding: '7px 10px', outline: 'none', letterSpacing: '0.05em', boxSizing: 'border-box', caretColor: GOLD, borderRadius: 9999 }}
              />
            </div>

            {/* Members list */}
            <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'none' }}>
              {shareMembers.length === 0 && (
                <div style={{ padding: '20px 14px', fontFamily: MONO, fontSize: 8, color: '#777', textAlign: 'center', letterSpacing: '0.15em' }}>LOADING...</div>
              )}
              {shareMembers
                .filter(m => {
                  if (String(m.id) === session?.user?.id) return false
                  if (String(m.id) === String(user?._id)) return false
                  const q = shareQuery.trim().toLowerCase()
                  if (!q) return true
                  return m.username?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q)
                })
                .map(m => {
                  const sent     = shareSent.has(String(m.id))
                  const sending  = shareSending.has(String(m.id))
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #111' }}>
                      {/* Avatar */}
                      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.avatar
                          ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                          : <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#777' }}>{(m.username || '?')[0].toUpperCase()}</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: MONO, fontSize: 9, color: GOLD, letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{m.username}</div>
                        {m.name && <div style={{ fontFamily: MONO, fontSize: 7, color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>}
                      </div>
                      <button
                        onClick={() => handleShareSend(String(m.id))}
                        disabled={sent || sending}
                        style={{
                          flexShrink: 0, fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
                          padding: '5px 10px', cursor: sent ? 'default' : 'pointer',
                          background: sent ? '#1a1a1a' : GOLD,
                          color: sent ? '#444' : '#000',
                          border: 'none', borderRadius: 9999, opacity: sending ? 0.5 : 1,
                        }}
                      >
                        {sent ? 'Sent' : sending ? '...' : 'Send'}
                      </button>
                    </div>
                  )
                })
              }
            </div>

          </div>
        </div>
      )}
    </>
  )
}
