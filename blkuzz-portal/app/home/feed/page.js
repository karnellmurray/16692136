'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Mail, User, Volume2, VolumeX } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// ─── Discipline pluralisation ─────────────────────────────────────────────────
const PLURAL_MAP = {
  'Music':        'Musicians',    'Film':         'Filmmakers',
  'Photography':  'Photographers','Fashion':      'Fashion Designers',
  'Visual Art':   'Visual Artists','Design':      'Designers',
  'Writing':      'Writers',      'Dance':        'Dancers',
  'Theatre':      'Theatre Makers','Architecture':'Architects',
  'Illustration': 'Illustrators', 'Animation':   'Animators',
  'Technology':   'Developers',   'Sculpture':   'Sculptors',
  'Poetry':       'Poets',        'Sound Design':'Sound Designers',
  'Directing':    'Directors',    'Ceramics':    'Ceramicists',
  'Streetwear':   'Streetwear Designers','Gaming':'Game Designers',
  'Comedy':       'Comedians',    'Business':    'Business People',
}
const pluralise = d => PLURAL_MAP[d] ?? `${d}s`

// ─── Type config (used by Ticker) ────────────────────────────────────────────
const TYPE = {
  project:  { label: '→ PROJECT',  color: '#00ff88' },
  update:   { label: '→ UPDATE',   color: '#aaaaaa' },
  bulletin: { label: '→ CALLOUTS', color: '#e8ff00' },
  blkuzz:   { label: '→ BLKUZZ',  color: '#ff4444' },
  collab:   { label: '→ COLLAB',  color: '#00aaff' },
}

// ─── Time helper (used by Ticker) ────────────────────────────────────────────
function ago(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── Static screen cards — reference design ──────────────────────────────────
// Grid is disconnected from API. Cards are hardcoded exactly as the reference.
const STATIC_SCREENS = [
  {
    id: 1, typeLabel: '→ PROJECT', typeColor: '#00ff88', bg: '#001a0d',
    handle: '@nova.ldn',
    title: 'ECLIPSE — visual identity for underground rave series',
    time: '2m ago', stat: '47 following',
  },
  {
    id: 2, typeLabel: '→ CALLOUTS', typeColor: '#e8ff00', bg: '#1a1700',
    handle: '@dopamine.col',
    title: 'Need a film editor who moves fast. No slow shit.',
    time: '8m ago', stat: '12 replies',
  },
  {
    id: 3, typeLabel: '→ BLKUZZ', typeColor: '#ff4444', bg: '#1a0000',
    handle: '@blkuzz.official',
    title: 'Studio sessions now open. Send your work.',
    time: '1h ago', stat: '211 views',
  },
  {
    id: 4, typeLabel: '→ COLLAB', typeColor: '#00aaff', bg: '#00081a',
    handle: '@rawtape',
    title: '@kxng.type — your type work would be insane on my next drop',
    time: '15m ago', stat: 'open',
  },
  {
    id: 5, typeLabel: '→ UPDATE', typeColor: '#aaaaaa', bg: '#0d0d0d',
    handle: '@kxng.type',
    title: 'Chapter 3 of MONOLITH is done. Took 6 weeks.',
    time: '32m ago', stat: '89 following',
  },
  {
    id: 6, typeLabel: '→ CALLOUTS', typeColor: '#e8ff00', bg: '#001a0d',
    handle: '@zyko.sound',
    title: 'Vocalist wanted — NOCTURNE EP. South London preferred.',
    time: '44m ago', stat: '5 replies',
  },
]

// SVG art shapes per card — matches reference design exactly
function ScreenArt({ id }) {
  if (id === 1) return <>
    <line x1="0" y1="20" x2="100" y2="60" stroke="rgba(0,255,136,0.2)" strokeWidth="1" />
    <line x1="0" y1="40" x2="100" y2="10" stroke="rgba(0,255,136,0.15)" strokeWidth="1" />
    <rect x="20" y="15" width="60" height="50" fill="none" stroke="rgba(0,255,136,0.3)" strokeWidth="0.5" />
    <rect x="30" y="25" width="40" height="30" fill="rgba(0,255,136,0.08)" />
    <text x="50" y="43" textAnchor="middle" fill="rgba(0,255,136,0.33)" fontFamily="monospace" fontSize="14" fontWeight="700">E</text>
  </>
  if (id === 2) return <>
    <circle cx="50" cy="40" r="30" fill="none" stroke="rgba(232,255,0,0.25)" strokeWidth="8" />
    <circle cx="50" cy="40" r="15" fill="rgba(232,255,0,0.12)" />
    <line x1="0" y1="0" x2="100" y2="80" stroke="rgba(232,255,0,0.15)" strokeWidth="0.5" />
    <line x1="100" y1="0" x2="0" y2="80" stroke="rgba(232,255,0,0.15)" strokeWidth="0.5" />
  </>
  if (id === 3) return <>
    <rect x="10" y="10" width="20" height="60" fill="rgba(255,68,68,0.15)" />
    <rect x="40" y="25" width="20" height="45" fill="rgba(255,68,68,0.2)" />
    <rect x="70" y="5" width="20" height="70" fill="rgba(255,68,68,0.3)" />
  </>
  if (id === 4) return <>
    <ellipse cx="50" cy="40" rx="45" ry="20" fill="none" stroke="rgba(0,170,255,0.2)" strokeWidth="1" />
    <ellipse cx="50" cy="40" rx="30" ry="12" fill="none" stroke="rgba(0,170,255,0.18)" strokeWidth="1" />
    <ellipse cx="50" cy="40" rx="15" ry="6" fill="rgba(0,170,255,0.1)" />
  </>
  if (id === 5) return <>
    <path d="M0 60 Q25 20 50 50 Q75 80 100 30" fill="none" stroke="rgba(80,80,80,0.4)" strokeWidth="1.5" />
    <path d="M0 40 Q25 70 50 35 Q75 10 100 50" fill="none" stroke="rgba(60,60,60,0.3)" strokeWidth="1" />
  </>
  // id === 6
  return <>
    <line x1="0" y1="35" x2="100" y2="35" stroke="rgba(0,255,136,0.3)" strokeWidth="1" />
    <line x1="0" y1="38" x2="60" y2="38" stroke="rgba(0,255,136,0.2)" strokeWidth="1" />
    <line x1="0" y1="41" x2="80" y2="41" stroke="rgba(0,255,136,0.15)" strokeWidth="1" />
    <circle cx="75" cy="20" r="12" fill="rgba(0,255,136,0.12)" stroke="rgba(0,255,136,0.25)" strokeWidth="1" />
  </>
}

// Explicit grid placement — avoids gridTemplateAreas string parsing issues.
// Layout: A=wide top, B=tall right, C=tall left, D/E/F=small squares
const CARD_POSITIONS = [
  { gridColumn: '1 / 3', gridRow: '1 / 2' }, // A: 2 cols, row 1
  { gridColumn: '3 / 4', gridRow: '1 / 3' }, // B: col 3, rows 1–2
  { gridColumn: '1 / 2', gridRow: '2 / 4' }, // C: col 1, rows 2–3
  { gridColumn: '2 / 3', gridRow: '2 / 3' }, // D: col 2, row 2
  { gridColumn: '2 / 3', gridRow: '3 / 4' }, // E: col 2, row 3
  { gridColumn: '3 / 4', gridRow: '3 / 4' }, // F: col 3, row 3
]

// ─── Screen card ─────────────────────────────────────────────────────────────
function ScreenCard({ card, position, onVideoEnded, onVideoPlay, onClick }) {
  const [hovered, setHovered] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const isBlkuzz = card.typeLabel === '→ BLKUZZ'
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        ...position,
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
        minHeight: 0,
        cursor: 'pointer',
        border: '1px solid #1a1a1a',
      }}
    >
      {/* Absolute inner — fills the grid cell exactly, clipping all content */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: (card.videoUrl || card.coverImage || card.collabMembers || card.liveData) ? card.bg : 'transparent',
      }}>
        {/* Visual — video → cover image → SVG art → collab avatars */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          {card.videoUrl ? (
            <>
              <video key={card.videoUrl} autoPlay muted={isBlkuzz ? !soundOn : !card.withSound} playsInline onEnded={onVideoEnded} onPlay={onVideoPlay}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}>
                <source src={card.videoUrl} />
              </video>
              {isBlkuzz && (
                <button onClick={e => { e.stopPropagation(); setSoundOn(s => !s) }}
                  style={{ position: 'absolute', bottom: 6, right: 6, background: 'none', border: `1px solid #FDC214`, borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  {soundOn ? <Volume2 size={10} color="#FDC214" /> : <VolumeX size={10} color="#FDC214" />}
                </button>
              )}
            </>
          ) : card.coverImage ? (
            <img src={card.coverImage} alt=""
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: card.coverImagePosition ?? '50% 50%', display: 'block' }} />
          ) : card.collabMembers ? (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {card.collabMembers.slice(0, 4).map((m, idx) => (
                  <div key={idx} style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid #00081a', marginLeft: idx === 0 ? 0 : -10, background: '#0a1a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: card.collabMembers.length - idx }}>
                    {m.avatar
                      ? <img src={m.avatar} alt={m.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                      : <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00aaff', fontWeight: 700 }}>{m.username?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Text — only shown when real content is loaded */}
        {(card.videoUrl || card.coverImage || card.collabMembers || card.liveData) && <div style={{ flexShrink: 0, padding: 10 }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase', color: card.typeColor, display: 'block', marginBottom: 4 }}>
            {card.typeLabel}
          </span>
          {card.collabMembers ? (
            <>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 600, color: '#e8e8e8', lineHeight: 1.3, marginBottom: 4 }}>
                <span style={{ color: '#00aaff' }}>
                  {card.collabMembers.slice(0, 2).map(m => `@${m.username}`).join(' ')}
                </span>
                {card.collabMembers.length === 1 ? ' is working on ' : ' are collaborating on '}
                <span style={{ color: '#fff', fontWeight: 700 }}>{card.title}</span>
              </div>
              {card.tagline && (
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {card.tagline}
                </div>
              )}
            </>
          ) : (
            <>
              {card.typeLabel !== '→ BLKUZZ' && (
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: card.typeLabel === '→ PROJECT' || card.typeLabel === '→ CALLOUTS' ? 10 : 8, color: card.typeLabel === '→ CALLOUTS' ? '#777' : 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>
                  {card.handle}
                </span>
              )}
              <div className={['→ UPDATE', '→ MEDIA', '→ MILESTONE'].includes(card.typeLabel) ? '' : 'font-head'} style={{ fontFamily: ['→ UPDATE', '→ MEDIA', '→ MILESTONE'].includes(card.typeLabel) ? 'Space Grotesk, sans-serif' : undefined, fontSize: card.typeLabel === '→ PROJECT' || card.typeLabel === '→ CALLOUTS' ? 14 : 11, fontWeight: 700, color: '#e8e8e8', lineHeight: 1.25, marginBottom: card.description ? 3 : 6, letterSpacing: ['→ UPDATE', '→ MEDIA', '→ MILESTONE'].includes(card.typeLabel) ? 'normal' : '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {card.title}
              </div>
              {card.description && (
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: card.typeLabel === '→ CALLOUTS' ? 11 : 9, color: card.typeLabel === '→ CALLOUTS' ? '#777' : 'rgba(255,255,255,0.4)', lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {card.description}
                </div>
              )}
              {card.date && (
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#e8ff00', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Date: {new Date(card.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {card.typeLabel !== '→ BLKUZZ' && (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: card.typeLabel === '→ PROJECT' || card.typeLabel === '→ CALLOUTS' ? 9 : 7, color: (card.typeLabel === '→ PROJECT' || card.typeLabel === '→ CALLOUTS') ? '#777' : 'rgba(255,255,255,0.3)' }}>{card.time}</span>
                )}
                {card.typeLabel === '→ CALLOUTS' && card.stat
                  ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#e8ff00', border: '1px solid #e8ff00', borderRadius: 999, padding: '2px 8px', marginLeft: 'auto' }}>{card.stat}</span>
                  : <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: card.typeLabel === '→ PROJECT' ? 9 : 7, color: card.typeLabel === '→ PROJECT' ? '#777' : 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{card.stat}</span>
                }
              </div>
            </>
          )}
        </div>}
      </div>

      {hovered && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '1px solid rgba(0,255,136,0.2)', pointerEvents: 'none' }} />
      )}
    </div>
  )
}


// ─── Ticker ──────────────────────────────────────────────────────────────────
const TICKER_BLOCK_WIDTHS = [14, 22, 10, 18, 8, 20, 12, 24, 11, 16, 19, 9]
const TICKER_PIXELS_PER_SECOND = 40

// The track is rendered twice back-to-back and animates translateX(-50%) to
// loop seamlessly, so the actual distance travelled per cycle is half the
// track's full (doubled) width. Tailwind's animate-ticker class ships a
// fixed 100s duration, which made the ride get faster as more content made
// the track wider (same distance-per-time budget covering more pixels).
// Measuring the real width and computing duration from it keeps px/s constant
// no matter how much content is on the platform.
function useTickerDuration(deps) {
  const trackRef = useRef(null)
  const [duration, setDuration] = useState(100)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => {
      const distance = el.scrollWidth / 2
      if (distance > 0) setDuration(distance / TICKER_PIXELS_PER_SECOND)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return [trackRef, duration]
}

function Ticker({ items }) {
  const [loadingTrackRef, loadingDuration] = useTickerDuration([items === null])
  const [liveTrackRef, liveDuration]       = useTickerDuration([items])

  if (items === null) {
    const doubled = [...TICKER_BLOCK_WIDTHS, ...TICKER_BLOCK_WIDTHS]
    return (
      <div className="border-t border-b border-[#1a1a1a] overflow-hidden py-1.5" style={{ background: '#0a0a0a' }}>
        <div ref={loadingTrackRef} className="inline-flex gap-10 animate-ticker whitespace-nowrap" style={{ width: 'max-content', animationDuration: `${loadingDuration}s`, WebkitTransform: 'translateZ(0)', WebkitBackfaceVisibility: 'hidden' }}>
          {doubled.map((len, i) => (
            <span key={i} className="font-mono text-[9px] flex items-center gap-2 animate-pulse"
              style={{ color: '#1e1e1e', animationDelay: `${(i % 6) * 0.28}s`, animationDuration: '2.4s' }}>
              <span style={{ color: '#262626' }}>→</span>
              {'█'.repeat(len)}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (!items.length) return null

  const doubled = [...items, ...items]
  return (
    <div className="border-t border-b border-[#1a1a1a] overflow-hidden py-1.5" style={{ background: '#0a0a0a' }}>
      <div ref={liveTrackRef} className="inline-flex gap-10 animate-ticker whitespace-nowrap" style={{ width: 'max-content', animationDuration: `${liveDuration}s`, WebkitTransform: 'translateZ(0)', WebkitBackfaceVisibility: 'hidden' }}>
        {doubled.map((item, i) => (
          <span key={i} className="font-mono text-[9px] tracking-[0.12em] flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ color: item.color }}>{item.prefix}</span>
            {item.text}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter()
  const [time, setTime]               = useState('')
  const [projects, setProjects]       = useState([])
  const [projectIdx, setProjectIdx]   = useState(0)
  const [hqVideos, setHqVideos]         = useState([])
  const [hqVideoIdx, setHqVideoIdx]     = useState(0)
  const [updates, setUpdates]           = useState([])
  const [updateIdx, setUpdateIdx]       = useState(0)
  const [notifOpen, setNotifOpen]       = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread]             = useState(0)
  const [inboxOpen, setInboxOpen]       = useState(false)
  const [conversations, setConversations] = useState([])
  const [inboxLoading, setInboxLoading] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [collabs, setCollabs]           = useState([])
  const [collabIdx, setCollabIdx]       = useState(0)
  const [myAvatar, setMyAvatar]         = useState(null)
  const [myAvatarErr, setMyAvatarErr]   = useState(false)
  const [collabAds, setCollabAds]       = useState([])
  const [collabAdIdx, setCollabAdIdx]   = useState(0)
  const [adFlash, setAdFlash]           = useState(false)
  const [bulletinCallouts, setBulletinCallouts] = useState([])
  const [bulletinIdx, setBulletinIdx]           = useState(0)

  // Clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Fetch current user avatar
  useEffect(() => {
    apiFetch('/api/profile').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setMyAvatar(d.avatar?.url || d.profileImage || null)
    }).catch(() => {})
  }, [])

  // Unread notifications count polling
  useEffect(() => {
    const fetch = () => apiFetch('/api/notifications').then(r => r.ok ? r.json() : null).then(d => { if (d) setUnread(d.unread ?? 0) }).catch(() => {})
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [])

  // Unread messages count polling
  useEffect(() => {
    const fetch = () => apiFetch('/api/messages').then(r => r.ok ? r.json() : null).then(d => {
      if (Array.isArray(d)) setUnreadMessages(d.reduce((sum, c) => sum + (c.unread ?? 0), 0))
    }).catch(() => {})
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [])

  async function openInbox() {
    setInboxOpen(true)
    setNotifOpen(false)
    setInboxLoading(true)
    const data = await apiFetch('/api/messages').then(r => r.ok ? r.json() : null).catch(() => null)
    if (data) { setConversations(Array.isArray(data) ? data : []); setUnreadMessages(0) }
    setInboxLoading(false)
  }

  async function openNotifs() {
    setNotifOpen(true)
    setInboxOpen(false)
    const data = await apiFetch('/api/notifications').then(r => r.ok ? r.json() : null).catch(() => null)
    if (data) { setNotifications(data.notifications ?? []); setUnread(0) }
    apiFetch('/api/notifications', { method: 'PATCH' }).catch(() => {})
  }

  async function respondToInvite(notifId, action) {
    const res = await apiFetch(`/api/notifications/${notifId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, status: action === 'accept' ? 'accepted' : 'declined', read: true } : n))
    }
  }

  const deleteNotif = async (id) => {
    setNotifications(prev => prev.filter(n => n._id !== id))
    await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  // Fetch projects with cover images and pick a random starting index
  useEffect(() => {
    apiFetch('/api/projects')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data.filter(p => p.status !== 'completed' && typeof p.coverImage === 'string' && p.coverImage.trim() !== '') : []
        if (list.length) {
          setProjects(list)
          setProjectIdx(Math.floor(Math.random() * list.length))
        }
      })
      .catch(() => {})
  }, [])

  // Rotate the project card every 6 seconds
  useEffect(() => {
    if (projects.length < 2) return
    const id = setInterval(() => setProjectIdx(i => (i + 1) % projects.length), 6000)
    return () => clearInterval(id)
  }, [projects.length])

  // Fetch HQ videos from the headquarters S3 bucket
  useEffect(() => {
    let cancelled = false
    apiFetch('/api/hq-videos')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        if (list.length) {
          const idx = Math.floor(Math.random() * list.length)
          setHqVideos([...list.slice(idx), ...list.slice(0, idx)])
          setHqVideoIdx(0)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const nextHqVideo = () => setHqVideoIdx(i => (i + 1) % hqVideos.length)

  const incrementHqView = (key) => {
    apiFetch('/api/hq-videos/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.views != null) {
        setHqVideos(prev => prev.map(v => v.key === key ? { ...v, views: d.views } : v))
      }
    }).catch(() => {})
  }

  // Fetch update posts (project cover + update content)
  useEffect(() => {
    apiFetch('/api/feed/updates')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : []
        if (list.length) {
          setUpdates(list)
          setUpdateIdx(Math.floor(Math.random() * list.length))
        }
      })
      .catch(() => {})
  }, [])

  // Rotate update card every 7 seconds
  useEffect(() => {
    if (updates.length < 2) return
    const id = setInterval(() => {
      setUpdateIdx(i => {
        const curProject = updates[i]?.projectTitle
        const diff = updates.map((u, idx) => idx).filter(idx => updates[idx]?.projectTitle !== curProject)
        const pool = diff.length ? diff : updates.map((_, idx) => idx).filter(idx => idx !== i)
        return pool[Math.floor(Math.random() * pool.length)]
      })
    }, 7000)
    return () => clearInterval(id)
  }, [updates.length])

  // Fetch collab data
  useEffect(() => {
    apiFetch('/api/feed/collabs')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const raw = Array.isArray(data) ? data : []
        // Expand: team entry (2+ members) + one solo entry per member
        const expanded = []
        raw.forEach(collab => {
          if (collab.members.length >= 2) expanded.push({ ...collab, solo: false })
          collab.members.forEach(m => expanded.push({ ...collab, members: [m], solo: true }))
        })
        if (expanded.length) { setCollabs(expanded); setCollabIdx(Math.floor(Math.random() * expanded.length)) }
      })
      .catch(() => {})
  }, [])

  // Rotate collab card every 8 seconds
  useEffect(() => {
    if (collabs.length < 2) return
    const id = setInterval(() => setCollabIdx(i => (i + 1) % collabs.length), 8000)
    return () => clearInterval(id)
  }, [collabs.length])

  // Fetch projects looking for collaborators
  useEffect(() => {
    apiFetch('/api/projects?collab=1')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data.filter(p => p.status !== 'completed' && p.collaboratorDisciplines?.length) : []
        if (list.length) { setCollabAds(list); setCollabAdIdx(Math.floor(Math.random() * list.length)) }
      })
      .catch(() => {})
  }, [])

  // Rotate collab ad every 6 seconds with flash cut
  useEffect(() => {
    if (collabAds.length < 2) return
    const id = setInterval(() => {
      setAdFlash(true)
      setTimeout(() => { setCollabAdIdx(i => (i + 1) % collabAds.length) }, 80)
      setTimeout(() => setAdFlash(false), 200)
    }, 10000)
    return () => clearInterval(id)
  }, [collabAds.length])

  // Fetch bulletin callouts with media
  useEffect(() => {
    apiFetch('/api/collaborate')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data.filter(p => p.media?.length > 0 || p.projectRef?.coverImage) : []
        if (list.length) { setBulletinCallouts(list); setBulletinIdx(Math.floor(Math.random() * list.length)) }
      })
      .catch(() => {})
  }, [])

  // Rotate bulletin callout every 6 seconds
  useEffect(() => {
    if (bulletinCallouts.length < 2) return
    const id = setInterval(() => setBulletinIdx(i => (i + 1) % bulletinCallouts.length), 6000)
    return () => clearInterval(id)
  }, [bulletinCallouts.length])

  // Build live ticker — include all available items from every source, shuffled once
  const tickerItems = useMemo(() => {
    const hasData = projects.length || bulletinCallouts.length || collabs.length || collabAds.length || updates.length
    if (!hasData) return null

    const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)
    const items = []

    projects.forEach(p => {
      const who = p.creator?.username ? `@${p.creator.username}` : null
      items.push({ prefix: '→ PROJECT', color: '#00ff88', text: who ? `${who} posted ${p.title}` : p.title })
    })

    bulletinCallouts.forEach(b => {
      const who = b.author?.username ? `@${b.author.username}` : null
      const body = b.content ? b.content.slice(0, 60) : (b.projectName || b.category || '')
      items.push({ prefix: '→ CALLOUTS', color: '#e8ff00', text: who ? `${who}: ${body}` : body })
    })

    collabs.filter(c => !c.solo).forEach(tc => {
      const names = tc.members.slice(0, 2).map(m => `@${m.username}`).join(' ')
      items.push({ prefix: '→ COLLAB', color: '#00aaff', text: `${names} are collaborating on ${tc.title}` })
    })

    collabAds.forEach(ad => {
      const discs = (ad.collaboratorDisciplines ?? []).slice(0, 2).map(pluralise).join(', ')
      items.push({ prefix: '→ COLLAB', color: '#00aaff', text: `${ad.title}${discs ? ` — seeking ${discs}` : ''}` })
    })

    updates.forEach(u => {
      const body = u.content ? u.content.slice(0, 60) : ''
      if (body) items.push({ prefix: '→ UPDATE', color: '#aaaaaa', text: u.handle ? `${u.handle} — ${body}` : body })
    })

    return shuffle(items)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length, bulletinCallouts.length, collabs.length, collabAds.length, updates.length])

  // Build screens — card 0: live project, card 1: bulletin callout, card 2: HQ video, card 3: collab, card 4: update post
  const activeProject   = projects[projectIdx]        ?? null
  const activeHqVideo   = hqVideos[hqVideoIdx]        ?? null
  const activeUpdate    = updates[updateIdx]          ?? null
  const activeCollab    = collabs[collabIdx]          ?? null
  const activeBulletin  = bulletinCallouts[bulletinIdx] ?? null
  const screens = STATIC_SCREENS.map((card, i) => {
    if (i === 1 && activeBulletin) {
      const firstMedia = activeBulletin.media?.[0] || activeBulletin.projectRef?.coverImage
      const isVid = /\.(mp4|mov|webm|ogg|avi|m4v|mkv|3gp)(\?|$)/i.test(firstMedia)
      return {
        ...card,
        handle:      `@${activeBulletin.author?.username ?? 'unknown'}`,
        title:       activeBulletin.projectName || activeBulletin.category || card.title,
        description: activeBulletin.content,
        time:        activeBulletin.createdAt ? ago(activeBulletin.createdAt) : card.time,
        stat:        activeBulletin.category ?? card.stat,
        date:        activeBulletin.date || null,
        ...(isVid ? { videoUrl: firstMedia } : { coverImage: firstMedia }),
      }
    }
    if (i === 0 && activeProject) {
      return {
        ...card,
        handle:             `@${activeProject.creator?.username ?? 'unknown'}`,
        title:              activeProject.title,
        coverImage:         activeProject.coverImage,
        coverImagePosition: activeProject.coverImagePosition ?? '50% 50%',
        time:               activeProject.createdAt ? ago(activeProject.createdAt) : card.time,
        stat:               `${activeProject.followers?.length ?? 0} following`,
      }
    }
    if (i === 2 && activeHqVideo) {
      const filename = decodeURIComponent(activeHqVideo.url.split('/').pop().split('?')[0]).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').toUpperCase()
      return { ...card, videoUrl: activeHqVideo.url, videoKey: activeHqVideo.key, withSound: false, title: filename, stat: `${activeHqVideo.views} views` }
    }
    if (i === 3 && activeCollab) {
      return {
        ...card,
        collabMembers: activeCollab.members,
        title:         activeCollab.title,
        tagline:       activeCollab.tagline,
      }
    }
    if (i === 4 && activeUpdate) {
      const typeLabel = activeUpdate.type === 'media' ? '→ MEDIA' : activeUpdate.type === 'milestone' ? '→ MILESTONE' : '→ UPDATE'
      const coverImg  = activeUpdate.coverImage || activeUpdate.media?.[0] || null
      const isVid     = coverImg && /\.(mp4|mov|webm|ogg|avi|m4v|mkv|3gp)(\?|$)/i.test(coverImg)
      return {
        ...card,
        liveData:           true,
        typeLabel,
        handle:             activeUpdate.handle,
        title:              activeUpdate.content || activeUpdate.projectTitle,
        ...(isVid ? { videoUrl: coverImg } : { coverImage: coverImg }),
        coverImagePosition: activeUpdate.coverImagePosition,
        time:               ago(activeUpdate.createdAt),
        stat:               activeUpdate.stat,
      }
    }
    return card
  })

  return (
    <div className="font-space page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#e8e8e8', overflow: 'hidden' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1f1f1f]" style={{ background: '#0a0a0a' }}>
        <span className="font-head text-[15px]" style={{ color: '#FDC214', letterSpacing: '2px' }}>BLKUZZ</span>
        <div className="flex items-center gap-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#008000] animate-pulse2 inline-block" />
          <span className="font-mono text-[10px] tracking-[0.15em] text-[#008000]">LIVE</span>
          <span className="font-mono text-[10px] text-[#777] tracking-[0.1em]">{time}</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative" onClick={openNotifs} style={{ cursor: 'pointer' }}>
            <Bell size={16} className="text-[#FDC214] hover:text-white transition-colors" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono text-[7px]"
                style={{ background: '#D2042D', color: '#fff' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <div className="relative" onClick={openInbox} style={{ cursor: 'pointer' }}>
            <Mail size={16} className="text-[#FDC214] hover:text-white transition-colors" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono text-[7px]"
                style={{ background: '#D2042D', color: '#fff' }}>
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </div>
          <div className="w-6 h-6 rounded-full overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
            {myAvatar && !myAvatarErr
              ? <img src={myAvatar} alt="" className="w-full h-full object-cover" onError={() => setMyAvatarErr(true)} />
              : <User size={10} className="text-[#FDC214]" />
            }
          </div>
        </div>
      </div>

      {/* Ticker — live data, falls back to static reference items */}
      <Ticker items={tickerItems} />

      {/* Grid header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a]">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#777]">Active transmissions</span>
        <span className="font-mono text-[9px] text-[#777]">6 live</span>
      </div>

      {(() => {
        const adTile = collabAds.length > 0 && (() => {
          const ad = collabAds[collabAdIdx]
          return (
            <div onClick={ad.slug ? () => router.push(`/home/projects/${ad.slug}`) : undefined} style={{
              gridColumn: '3 / 4', gridRow: '3 / 4',
              position: 'relative', overflow: 'hidden',
              background: '#0c0c00',
              border: '1px solid rgba(232,255,0,0.3)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              padding: 12,
              cursor: ad.slug ? 'pointer' : 'default',
              zIndex: 2,
            }}>
              {/* Scanlines */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(232,255,0,0.02) 3px, rgba(232,255,0,0.02) 4px)', pointerEvents: 'none' }} />
              {/* Flash overlay */}
              <div style={{ position: 'absolute', inset: 0, background: '#e8ff00', opacity: adFlash ? 0.85 : 0, transition: adFlash ? 'none' : 'opacity 0.15s ease', pointerEvents: 'none', zIndex: 3 }} />

              <div className="flex items-center mb-2">
                <span className="font-mono text-[7px] tracking-[0.2em] uppercase" style={{ color: '#e8ff00' }}>→ LOOKING FOR</span>
              </div>

              <p className="font-head leading-tight mb-1" style={{ color: '#fff', fontSize: 17, letterSpacing: '1px' }}>
                {ad.title}
              </p>
              <p className="font-mono mb-2" style={{ color: '#777', fontSize: 10 }}>is looking for</p>

              <div className="flex flex-wrap gap-1">
                {ad.collaboratorDisciplines.map((d, i) => (
                  <span key={i} className="font-mono tracking-[0.1em] uppercase px-2.5 py-1"
                    style={{ border: '1px solid rgba(232,255,0,0.6)', color: '#e8ff00', borderRadius: 9999, fontSize: 9 }}>
                    {pluralise(d)}
                  </span>
                ))}
              </div>

              {collabAds.length > 1 && (
                <div className="flex gap-1 mt-3">
                  {collabAds.map((_, i) => (
                    <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', display: 'inline-block', background: i === collabAdIdx ? '#e8ff00' : 'rgba(255,255,255,0.15)' }} />
                  ))}
                </div>
              )}
            </div>
          )
        })()

        return (
          <div style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr 1fr',
            gap: 2,
            padding: 2,
            boxSizing: 'border-box',
          }}>
            {screens.map((card, i) => {
              const screenHref =
                i === 0 && activeProject?.slug   ? `/home/projects/${activeProject.slug}`
                : i === 1 && activeBulletin?._id ? `/home/collaborate?post=${activeBulletin._id}`
                : i === 3 && activeCollab?.slug  ? `/home/projects/${activeCollab.slug}`
                : i === 4 && activeUpdate?.projectSlug ? `/home/projects/${activeUpdate.projectSlug}`
                : null
              return (
                <ScreenCard key={card.id} card={card} position={CARD_POSITIONS[i]}
                  onVideoEnded={i === 2 ? nextHqVideo : undefined}
                  onVideoPlay={i === 2 && card.videoKey ? () => incrementHqView(card.videoKey) : undefined}
                  onClick={screenHref ? () => router.push(screenHref) : undefined} />
              )
            })}
            {adTile}
          </div>
        )
      })()}

      {/* Notification panel */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:block" onClick={() => setNotifOpen(false)}>
          <div className="w-[90vw] max-w-80 lg:absolute lg:top-10 lg:right-4 lg:w-80 bg-black overflow-hidden"
            style={{ border: '1px solid #FDC214', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(253,194,20,0.35)' }}>
              <span className="font-head" style={{ color: '#FDC214', letterSpacing: '2px', fontSize: 13 }}>Notifications</span>
              <button onClick={() => setNotifOpen(false)} className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                <img src="/portal/icons/cross-y.png" alt="close" style={{ width: 12, height: 12, objectFit: 'contain' }} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 && (
                <p className="font-mono text-[8px] text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No notifications</p>
              )}
              {notifications.map(n => {
                const target = n.type === 'collab_request' && n.bulletinPost
                  ? `/home/collaborate?post=${n.bulletinPost}`
                  : n.link
                return (
                <div key={n._id} className="px-4 py-3 border-b border-[#0f0f0f]"
                  style={{ background: n.read ? 'transparent' : 'rgba(253,194,20,0.03)', cursor: target ? 'pointer' : 'default' }}
                  onClick={() => { if (target) { setNotifOpen(false); router.push(target) } }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {n.type === 'collab_invite' && (
                        <span className="inline-block font-mono text-[6px] tracking-widest uppercase px-2 py-0.5 mb-2" style={{ border: '1px solid #FDC214', color: '#FDC214', borderRadius: 50 }}>Invite</span>
                      )}
                      {n.type === 'collab_request' && n.status === 'pending' && (
                        <span className="inline-block font-mono text-[6px] tracking-widest uppercase px-2 py-0.5 mb-2" style={{ border: '1px solid #00aaff', color: '#00aaff', borderRadius: 50 }}>Collab Request</span>
                      )}
                      {n.type === 'comment' && n.project?.title && (
                        <span className="inline-flex items-center justify-center font-mono text-[6px] tracking-widest uppercase px-2 py-0.5 mb-2" style={{ border: '1px solid #FDC214', color: '#FDC214', borderRadius: 50 }}>{n.project.title}</span>
                      )}
                      {n.type !== 'collab_invite' && n.type !== 'collab_request' && n.type !== 'comment' && !n.read && (
                        <span className="w-1 h-1 rounded-full inline-block mr-1.5" style={{ background: '#FDC214', verticalAlign: 'middle' }} />
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteNotif(n._id) }} className="shrink-0 mt-0.5">
                      <img src="/portal/icons/trash-bin.png" alt="delete" style={{ width: 12, height: 12, filter: 'invert(21%) sepia(95%) saturate(7000%) hue-rotate(342deg) brightness(85%) contrast(115%)' }} />
                    </button>
                  </div>
                  <p className="font-mono text-[8px] leading-relaxed mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {n.type === 'collab_request' && n.from?.username
                      ? <><Link href={`/home/profile/${n.from.username}`} onClick={e => e.stopPropagation()} style={{ color: '#00aaff', textDecoration: 'none' }}>@{n.from.username}</Link>{n.text.replace(new RegExp(`@${n.from.username}`, 'i'), '')}</>
                      : n.text
                    }
                  </p>
                  {n.body && (
                    <p className="font-space text-[10px] leading-relaxed mt-1 pl-2" style={{ color: '#FDC214', borderLeft: '2px solid #FDC214' }}>{n.body}</p>
                  )}
                  <p className="font-mono text-[7px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {Math.floor((Date.now() - new Date(n.createdAt)) / 60000) < 60
                      ? `${Math.floor((Date.now() - new Date(n.createdAt)) / 60000)}m ago`
                      : `${Math.floor((Date.now() - new Date(n.createdAt)) / 3600000)}h ago`}
                  </p>
                  {(n.type === 'collab_invite' || n.type === 'collab_request') && n.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={e => { e.stopPropagation(); respondToInvite(n._id, 'accept') }}
                        className="font-mono text-[7px] tracking-widest uppercase px-3 py-1.5"
                        style={{ background: '#008000', color: '#fff', borderRadius: 50 }}>
                        Accept
                      </button>
                      <button onClick={e => { e.stopPropagation(); respondToInvite(n._id, 'decline') }}
                        className="font-mono text-[7px] tracking-widest uppercase px-3 py-1.5"
                        style={{ border: '1px solid #D2042D', color: '#D2042D', borderRadius: 50 }}>
                        Decline
                      </button>
                    </div>
                  )}
                  {(n.type === 'collab_invite' || n.type === 'collab_request') && n.status !== 'pending' && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[6px] tracking-widest uppercase inline-block"
                        style={{ color: n.status === 'accepted' ? '#008000' : 'rgba(255,255,255,0.3)' }}>
                        {n.status}
                      </span>
                      {n.type === 'collab_request' && n.status === 'accepted' && n.from?._id && (
                        <Link href={`/home/inbox?with=${n.from._id}`} onClick={e => e.stopPropagation()}
                          className="font-mono text-[6px] tracking-widest uppercase px-2 py-0.5"
                          style={{ border: '1px solid #FDC214', color: '#FDC214', borderRadius: 50, textDecoration: 'none' }}>
                          Message
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
        </div>
      )}

      {/* Inbox preview panel */}
      {inboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center lg:block" onClick={() => setInboxOpen(false)}>
          <div className="w-[90vw] max-w-80 lg:absolute lg:top-10 lg:right-4 lg:w-80 bg-black overflow-hidden"
            style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(253,194,20,0.35)' }}>
              <span className="font-head" style={{ color: '#FDC214', letterSpacing: '2px', fontSize: 13 }}>Messages</span>
              <button onClick={() => setInboxOpen(false)} className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                <img src="/portal/icons/cross-y.png" alt="close" style={{ width: 12, height: 12, objectFit: 'contain' }} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {inboxLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>LOADING...</div>
              )}
              {!inboxLoading && conversations.length === 0 && (
                <p className="font-mono text-[8px] text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>No messages</p>
              )}
              {!inboxLoading && conversations.map(c => {
                const partner   = c.user
                const lastMsg   = c.lastMessage
                const hasUnread = (c.unread ?? 0) > 0
                const avatarUrl = partner?.avatarUrl ?? null
                const inits     = (partner?.name || partner?.username || '?').slice(0, 2).toUpperCase()
                return (
                  <Link key={c._id} href={`/home/inbox?with=${partner?._id}`}
                    onClick={() => setInboxOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[#0f0f0f] hover:bg-white/5 transition-colors"
                    style={{ textDecoration: 'none', background: hasUnread ? 'rgba(253,194,20,0.03)' : 'transparent' }}>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ background: '#1a1a1a' }}>
                      {avatarUrl
                        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="font-mono text-[9px] font-bold" style={{ color: '#FDC214' }}>{inits}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono text-[9px] tracking-wider" style={{ color: '#FDC214' }}>@{partner?.username}</span>
                        {lastMsg?.createdAt && (
                          <span className="font-mono text-[7px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{ago(lastMsg.createdAt)}</span>
                        )}
                      </div>
                      <p className="font-mono text-[8px] truncate" style={{ color: hasUnread ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}>
                        {lastMsg?.content ?? '—'}
                      </p>
                    </div>
                    {hasUnread && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#D2042D' }} />
                    )}
                  </Link>
                )
              })}
            </div>

            <Link href="/home/inbox" onClick={() => setInboxOpen(false)}
              className="flex items-center justify-center py-3 font-mono text-[8px] tracking-widest uppercase"
              style={{ borderTop: '1px solid rgba(253,194,20,0.2)', color: '#FDC214', textDecoration: 'none' }}>
              View all messages
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
