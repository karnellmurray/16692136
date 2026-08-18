'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, FolderOpen } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// ─── Discipline colours ───────────────────────────────────────────────────────
const DISC = {
  Music:        { color: '#ff4444', bg: '#1a0000' },
  Film:         { color: '#008000', bg: '#001a0d' },
  Photography:  { color: '#00aaff', bg: '#00081a' },
  Fashion:      { color: '#ff8833', bg: '#1a0800' },
  'Visual Art': { color: '#00aaff', bg: '#00081a' },
  Design:       { color: '#e8ff00', bg: '#1a1700' },
  Writing:      { color: '#aaaaaa', bg: '#0f0f0f' },
  Architecture: { color: '#ff8833', bg: '#1a0800' },
  Other:        { color: '#888888', bg: '#111111' },
}
const discCfg = d => DISC[d] ?? DISC.Other

const DISC_ORDER = ['Fashion', 'Music', 'Film', 'Visual Art', 'Design', 'Photography', 'Writing', 'Architecture']

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ago(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60)      return `${s}s ago`
  if (s < 3600)    return `${Math.floor(s / 60)}m ago`
  if (s < 86400)   return `${Math.floor(s / 3600)}h ago`
  if (s < 604800)  return `${Math.floor(s / 86400)}d ago`
  if (s < 2629800) return `${Math.floor(s / 604800)}w ago`
  if (s < 31557600) return `${Math.floor(s / 2629800)}mo ago`
  return `${Math.floor(s / 31557600)}y ago`
}

function blkuzzIdFallback(id) {
  const n = parseInt(String(id).slice(-6), 16) % 9999 + 1
  return `BLK-${String(n).padStart(4, '0')}`
}

function nameFontSize(name = '') {
  const len = name.length
  if (len <= 14) return 14
  if (len <= 18) return 12
  if (len <= 24) return 11
  return 10
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
}

function genBarcode(seed = '') {
  let n = Array.from(seed).reduce((a, c) => a * 31 + c.charCodeAt(0), 7)
  return Array.from({ length: 20 }, () => {
    n = (n * 1103515245 + 12345) & 0x7fffffff
    return 5 + (n % 10)
  })
}

// ─── Agent card ───────────────────────────────────────────────────────────────
function AgentCard({ user, featured }) {
  const [hovered, setHovered]     = useState(false)
  const [imgError, setImgError]   = useState(false)
  const cfg  = discCfg(user.tags?.[0] ?? user.discipline)
  const bars = useMemo(() => genBarcode(user.username), [user.username])

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   'transparent',
        padding:      '12px 14px',
        display:      'flex',
        gap:          12,
        cursor:       'pointer',
        position:     'relative',
        overflow:     'hidden',
        border:       '1px solid #FDC214',
        borderRadius: 15,
        transition:   'all 0.15s',
      }}
    >
      {/* Scan-line top highlight */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${cfg.color}08, transparent)`, pointerEvents: 'none' }} />

      {/* ID photo */}
      <div style={{ width: 52, height: 62, flexShrink: 0, position: 'relative', overflow: 'hidden', border: '1px solid #1a1a1a' }}>
        {user.avatar && !imgError ? (
          <img src={user.avatar} alt="" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.3,
              backgroundImage: `linear-gradient(${cfg.color}08 1px, transparent 1px), linear-gradient(90deg, ${cfg.color}08 1px, transparent 1px)`,
              backgroundSize: '8px 8px',
            }} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 16, color: cfg.color + '60', position: 'relative', zIndex: 1 }}>
              {initials(user.name)}
            </span>
            <div className="dir-scanline" style={{ position: 'absolute', left: 0, right: 0, height: 2, background: cfg.color + '20' }} />
          </div>
        )}
        {/* Corner brackets */}
        {[['top:2px', 'left:2px', '1px 0 0 1px'], ['top:2px', 'right:2px', '1px 1px 0 0'], ['bottom:2px', 'left:2px', '0 0 1px 1px'], ['bottom:2px', 'right:2px', '0 1px 1px 0']].map(([v, h, bw], i) => {
          const [vk, vv] = v.split(':')
          const [hk, hv] = h.split(':')
          return <div key={i} style={{ position: 'absolute', width: 6, height: 6, borderColor: cfg.color + '40', borderStyle: 'solid', borderWidth: bw, [vk]: vv, [hk]: hv }} />
        })}
      </div>

      {/* Card body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.blkuzzId || blkuzzIdFallback(user.id)}{user.location ? ` · ${user.location}` : ''}
            </div>
            <div className="font-head" style={{ fontSize: nameFontSize(user.name), color: '#FDC214', letterSpacing: '2px', lineHeight: 1.2 }}>
              {user.name}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#fff', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @{user.username}
            </div>
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', flexShrink: 0, background: '#00800012', color: '#008000', border: '1px solid #00800030' }}>
            Active
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {user.tags?.length > 0 ? user.tags.map((t, i) => (
            <span key={t} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', border: '1px solid #FDC214', color: '#FDC214', borderRadius: 50 }}>
              {t}
            </span>
          )) : null}
        </div>

        {/* Bio */}
        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, color: '#fff', lineHeight: 1.45, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {user.bio || 'No bio yet.'}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
<span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.08em', color: '#FDC214' }}>
            <FolderOpen size={10} /> {user.projects} projects
          </span>

          {/* Barcode */}
          <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 14, marginLeft: 'auto', opacity: hovered ? 0 : 1, transition: 'opacity 0.15s' }}>
            {bars.map((h, i) => <div key={i} style={{ width: 1, height: h, background: '#FDC21440' }} />)}
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

export default function DirectoryPage() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [query, setQuery]           = useState('')
  const [discipline, setDiscipline] = useState('All')
  const [sort, setSort]             = useState(null)
  const [page, setPage]             = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    apiFetch('/api/directory')
      .then(r => {
        if (!r.ok) { setError(`API error ${r.status}`); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        const arr = Array.isArray(data) ? [...data] : []
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]]
        }
        setUsers(arr)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  // Unique tags present in data, alphabetically sorted
  const disciplines = useMemo(() => {
    const present = new Set(users.flatMap(u => u.tags ?? []))
    return [...present].sort((a, b) => a.localeCompare(b))
  }, [users])

  // Filter + sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = users.filter(u => {
      if (discipline !== 'All' && !(u.tags ?? []).includes(discipline)) return false
      if (q && !u.name.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q) && !(u.tags ?? []).some(t => t.toLowerCase().includes(q))) return false
      return true
    })
    if (sort === 'Recent')          list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    else if (sort === 'A–Z')        list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'Most followed')   list = [...list].sort((a, b) => b.followers - a.followers)
    else if (sort === 'Active projects') list = [...list].sort((a, b) => b.projects - a.projects)
    // null = keep shuffled order from load
    return list
  }, [users, query, discipline, sort])

  const visible   = filtered.slice(0, page * PAGE_SIZE)
  const remaining = filtered.length - visible.length

  return (
    <div className="font-space page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#e8e8e8', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <span className="font-head" style={{ fontSize: 15, color: '#FDC214', letterSpacing: '2px' }}>BLKUZZ</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', color: '#008000', border: '1px solid #00800030', padding: '3px 8px' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#008000] animate-pulse2 inline-block" />
          CLEARANCE GRANTED
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #141414', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #008000 2px, #008000 3px)', pointerEvents: 'none' }} />
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>
          Restricted access · member database
        </div>
        <div className="font-head" style={{ fontSize: 24, letterSpacing: '2px', color: '#fff', lineHeight: 1, marginBottom: 2 }}>
          Directory
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
          <span style={{ color: '#008000' }}>{loading ? '...' : users.length} members</span>
          {disciplines.length > 0 && <> · {disciplines.length} tags</>}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #141414', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#FDC214' }} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="SEARCH BY NAME, HANDLE, TAGS..."
            className="dir-search"
            style={{ width: '100%', background: '#111', border: '1px solid #FDC214', borderRadius: 50, color: '#fff', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, padding: '8px 12px 8px 28px', outline: 'none', letterSpacing: '0.05em', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Tag filter — collapsible toggle-button panel on mobile, pill row at lg+ */}
      {disciplines.length > 0 && (
        <>
          <div className="lg:hidden border-b border-[#141414]" style={{ flexShrink: 0 }}>
            <button onClick={() => setFiltersOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.15em]"
              style={{ background: 'transparent', border: 'none', color: discipline !== 'All' ? '#FDC214' : 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
              <span>Filters{discipline !== 'All' ? ` · ${discipline}` : ''}</span>
              <span style={{ color: '#FDC214', fontSize: 14 }}>{filtersOpen ? '−' : '+'}</span>
            </button>
            {filtersOpen && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
                {['All', ...disciplines].map(d => (
                  <button key={d} onClick={() => { setDiscipline(d); if (d === 'All') setSort(null); setPage(1) }}
                    className="font-mono text-[7px] tracking-[0.15em] uppercase px-2.5 py-1 border rounded-full whitespace-nowrap transition-colors"
                    style={{
                      borderColor: discipline === d ? '#FDC214' : 'rgba(255,255,255,0.15)',
                      color:       discipline === d ? '#0a0a0a' : 'rgba(255,255,255,0.4)',
                      background:  discipline === d ? '#FDC214' : 'transparent',
                      cursor: 'pointer',
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-[#141414]" style={{ flexShrink: 0 }}>
            {['All', ...disciplines].map(d => (
              <button key={d} onClick={() => { setDiscipline(d); if (d === 'All') setSort(null); setPage(1) }}
                className="font-mono text-[7px] tracking-[0.15em] uppercase px-2.5 py-1 border rounded-full whitespace-nowrap transition-colors"
                style={{
                  borderColor: discipline === d ? '#FDC214' : 'rgba(255,255,255,0.15)',
                  color:       discipline === d ? '#0a0a0a' : 'rgba(255,255,255,0.4)',
                  background:  discipline === d ? '#FDC214' : 'transparent',
                  cursor: 'pointer',
                }}>
                {d}
              </button>
            ))}
          </div>
        </>
      )}


      {/* Agent list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>
            LOADING...
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
          {!loading && error ? (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#ff4444', letterSpacing: '0.1em' }}>
              {error}
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>
              NO MEMBERS FOUND
            </div>
          ) : visible.map((user, i) => (
            <Link key={user.id} href={`/home/profile/${user.username}`} style={{ textDecoration: 'none', display: 'block' }}>
              <AgentCard user={user} featured={i === 0 && discipline === 'All' && !query} />
            </Link>
          ))}
        </div>

        {remaining > 0 && (
          <button onClick={() => setPage(p => p + 1)}
            style={{ width: '100%', padding: 14, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.2em', color: '#FDC214', cursor: 'pointer', background: 'none', border: 'none', textTransform: 'uppercase' }}>
            Load more members <span style={{ color: '#008000' }}>· {remaining} remaining</span>
          </button>
        )}
      </div>
    </div>
  )
}
