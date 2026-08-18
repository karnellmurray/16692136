'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Heart, MessageCircle, Send, Plus, X, Camera } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// ─── Discipline colour config ─────────────────────────────────────────────────
const DISC = {
  Music:        { color: '#D2042D', bg: '#1a0000' },
  Film:         { color: '#008000', bg: '#001a0d' },
  Photography:  { color: '#FDC214', bg: '#00081a' },
  Fashion:      { color: '#ff8833', bg: '#1a0800' },
  'Visual Art': { color: '#FDC214', bg: '#00081a' },
  Design:       { color: '#e8ff00', bg: '#1a1700' },
  Other:        { color: '#888888', bg: '#111111' },
}
const discCfg = d => DISC[d] ?? DISC.Other

const PLURAL_MAP = {
  'Music':         'Musicians',
  'Film':          'Filmmakers',
  'Photography':   'Photographers',
  'Fashion':       'Fashion Designers',
  'Visual Art':    'Visual Artists',
  'Design':        'Designers',
  'Writing':       'Writers',
  'Dance':         'Dancers',
  'Theatre':       'Theatre Makers',
  'Architecture':  'Architects',
  'Illustration':  'Illustrators',
  'Animation':     'Animators',
  'Technology':    'Developers',
  'Sculpture':     'Sculptors',
  'Poetry':        'Poets',
  'Sound Design':  'Sound Designers',
  'Directing':     'Directors',
  'Ceramics':      'Ceramicists',
  'Streetwear':    'Streetwear Designers',
  'Gaming':        'Game Designers',
  'Comedy':        'Comedians',
  'Business':      'Business People',
}
const pluralise = d => PLURAL_MAP[d] ?? `${d}s`

// ─── Post type config ─────────────────────────────────────────────────────────
const POST_TYPE = {
  update:    { label: '→ Update',     color: '#008000', border: 'rgba(0,128,0,0.2)', bg: 'rgba(0,128,0,0.06)', pillColor: '#FDC214' },
  milestone: { label: '→ Milestone',  color: '#008000', border: 'rgba(0,128,0,0.2)', bg: 'rgba(0,128,0,0.06)', pillColor: '#FDC214' },
  media:     { label: '→ Media drop', color: '#008000', border: 'rgba(0,128,0,0.2)', bg: 'rgba(0,128,0,0.06)', pillColor: '#FDC214' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ago(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  if (s < 2629800) return `${Math.floor(s / 604800)}w ago`
  if (s < 31557600) return `${Math.floor(s / 2629800)}mo ago`
  return `${Math.floor(s / 31557600)}y ago`
}
function runningDuration(date) {
  const days = Math.max(1, Math.floor((Date.now() - new Date(date)) / 86400000))
  if (days < 7)   return `${days}d`
  if (days < 365) return `${Math.floor(days / 7)}w`
  const years = days / 365
  return years < 2 ? '1yr' : `${Math.floor(years)}yrs`
}

// ─── Hero art ─────────────────────────────────────────────────────────────────
function HeroArt({ project }) {
  if (project.coverImage) return (
    <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover"
      style={{ objectPosition: project.coverImagePosition ?? '50% 50%' }} />
  )
  const cfg   = discCfg(project.discipline)
  const label = project.title?.slice(0, 5).toUpperCase() ?? ''
  return (
    <svg width="100%" height="200" viewBox="0 0 680 200" preserveAspectRatio="xMidYMid slice">
      <rect width="680" height="200" fill={cfg.bg} />
      <text x="340" y="115" textAnchor="middle" dominantBaseline="middle"
        fontFamily="Space Grotesk,sans-serif" fontWeight="900" fontSize="110"
        fill="#ffffff05" letterSpacing="-6">{label}</text>
      {[60,135,210,270].map((x, i) => (
        <rect key={x} x={x} y={15 + i * 5} width={50 + i * 5} height={100 - i * 5}
          fill="#ffffff07" stroke="#ffffff10" strokeWidth="0.5" />
      ))}
      <rect x="560" y="20" width="1" height="140" fill="#ffffff10" />
      <rect x="610" y="20" width="1" height="140" fill="#ffffff08" />
      <text x="585" y="80"  textAnchor="middle" fontFamily="IBM Plex Mono,monospace" fontSize="8" fill="#ffffff20" letterSpacing="3">{project.discipline?.slice(0,6).toUpperCase()}</text>
      <text x="585" y="97"  textAnchor="middle" fontFamily="IBM Plex Mono,monospace" fontSize="8" fill="#ffffff15" letterSpacing="2">BLKUZZ</text>
      <text x="585" y="114" textAnchor="middle" fontFamily="IBM Plex Mono,monospace" fontSize="8" fill="#ffffff10" letterSpacing="2">PORTAL</text>
      <rect x="0" y="155" width="680" height="45" fill="url(#hero-fade)" />
      <defs>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0" />
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ─── Chapter progress ─────────────────────────────────────────────────────────
function ChapterProgress({ chapters, isAuthor, onToggle }) {
  const CYCLE = { todo: 'active', active: 'done', done: 'todo' }
  return (
    <div className="px-3.5 py-3 border-b border-[#141414]">
      <span className="font-body font-normal text-[8px] tracking-[0.2em] uppercase block mb-2" style={{ color: '#e8e8e8' }}>
        Project Updates
      </span>
      <p className="font-mono text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Post about your project milestones. Share your thoughts and ideas, let members know what you&apos;re up to.
      </p>
    </div>
  )
}

// ─── Media helper ─────────────────────────────────────────────────────────────
const isVideo = url => /\.(mp4|mov|webm|ogg|avi|m4v|mkv|3gp)(\?|$)/i.test(url)
function MediaThumb({ url, className, style, onClick }) {
  if (isVideo(url)) return (
    <div className={`relative overflow-hidden ${className ?? ''}`}
      style={{ background: '#000', ...style, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}>
      <video
        src={url}
        muted
        playsInline
        preload="auto"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onLoadedData={e => { try { e.target.currentTime = 0 } catch {} }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.35)' }}>
        <div style={{ width: 18, height: 18, background: '#FDC214', WebkitMaskImage: 'url(/portal/icons/play-button-arrowhead.png)', maskImage: 'url(/portal/icons/play-button-arrowhead.png)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))' }} />
      </div>
    </div>
  )
  return <img src={url} alt="" className={className} style={style} onClick={onClick} />
}

function fmtTime(t) {
  if (!isFinite(t) || t < 0) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function VideoPlayer({ url, style }) {
  const videoRef = useRef(null)
  const [playing, setPlaying]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent]   = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted]       = useState(true)

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  const seek = e => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    v.currentTime = pct * v.duration
  }

  return (
    <div className="relative overflow-hidden" style={{ background: '#000', border: '1px solid #1a1a1a', ...style }}
      onClick={e => e.stopPropagation()}>
      <video
        ref={videoRef}
        src={url}
        playsInline
        muted={muted}
        onTimeUpdate={e => { setCurrent(e.target.currentTime); setProgress(e.target.duration ? (e.target.currentTime / e.target.duration) * 100 : 0) }}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
        onClick={toggle}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ width: 36, height: 36, background: '#FDC214', WebkitMaskImage: 'url(/portal/icons/play-button-arrowhead.png)', maskImage: 'url(/portal/icons/play-button-arrowhead.png)', WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }} />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-2 py-1.5"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
        <button onClick={toggle} className="flex-shrink-0">
          {playing
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="#FDC214"><rect x="5" y="3" width="5" height="18" /><rect x="14" y="3" width="5" height="18" /></svg>
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="#FDC214"><polygon points="5,3 19,12 5,21" /></svg>}
        </button>
        <div className="flex-1 h-[3px] cursor-pointer" style={{ background: 'rgba(255,255,255,0.15)' }} onClick={seek}>
          <div className="h-full" style={{ width: `${progress}%`, background: '#FDC214' }} />
        </div>
        <span className="font-mono text-[7px] tracking-wide flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {fmtTime(current)} / {fmtTime(duration)}
        </span>
        <button onClick={() => setMuted(m => !m)} className="flex-shrink-0">
          {muted
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FDC214" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FDC214" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 010 7.07" /></svg>}
        </button>
        <button onClick={() => videoRef.current?.requestFullscreen()} className="flex-shrink-0">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FDC214" strokeWidth="2">
            <polyline points="15,3 21,3 21,9" /><polyline points="9,21 3,21 3,15" />
            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Custom chapter dropdown ──────────────────────────────────────────────────
function ChapterDropdown({ chapters, value, onChange, onChapterAdded }) {
  const [open, setOpen]         = useState(false)
  const [newInput, setNewInput] = useState('')
  const ref                     = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allOptions = chapters ?? []
  const selected   = value || null

  const addNew = () => {
    const trimmed = newInput.trim()
    if (!trimmed || allOptions.some(c => c.title === trimmed)) return
    onChange(trimmed)
    setNewInput('')
    setOpen(false)
    onChapterAdded?.(trimmed)
  }

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 font-mono text-[9px] tracking-[0.05em]"
        style={{ background: '#111', border: '1px solid #1a1a1a', color: selected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>
        <span>{selected ?? 'Milestone (optional)'}</span>
        <svg width="8" height="5" viewBox="0 0 8 5" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M0 0l4 5 4-5z" fill="rgba(255,255,255,0.3)" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-0.5" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
          {[{ title: null }, ...allOptions].map((ch, i) => {
            const isPlaceholder = ch.title === null
            const isSelected    = !isPlaceholder && ch.title === value
            return (
              <button key={i} type="button"
                onClick={() => { onChange(isPlaceholder ? '' : ch.title); setOpen(false) }}
                className="w-full text-left px-3 py-2 font-mono text-[9px] tracking-[0.05em] transition-colors"
                style={{ borderTop: i > 0 ? '1px solid #1a1a1a' : 'none', color: isSelected ? '#FDC214' : isPlaceholder ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FDC214'; e.currentTarget.style.color = '#0a0a0a' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isSelected ? '#FDC214' : isPlaceholder ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)' }}>
                {isPlaceholder ? 'None' : ch.title}
              </button>
            )
          })}
          <div className="flex items-center gap-1.5 px-2 py-2" style={{ borderTop: '1px solid #1a1a1a' }}>
            <input
              value={newInput}
              onChange={e => setNewInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNew() } }}
              placeholder="Add new milestone…"
              className="flex-1 font-mono text-[9px] px-2 py-1 focus:outline-none placeholder-white/30"
              style={{ background: '#1a1a1a', border: 'none', color: '#FDC214' }}
            />
            <button type="button" onClick={addNew}
              className="font-mono text-[8px] px-2 py-1 shrink-0"
              style={{ background: '#FDC214', color: '#0a0a0a' }}>
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Post card ────────────────────────────────────────────────────────────────
function PostCard({ post, projectSlug, currentUserId, currentUsername, isAuthor, chapters, onRefresh }) {
  const cfg = POST_TYPE[post.type] ?? POST_TYPE.update
  const [likeCount, setLikeCount]           = useState(post.likeCount ?? 0)
  const [liked, setLiked]                   = useState(
    post.likes?.some(id => id === currentUserId || id?.toString() === currentUserId)
  )
  const [comments, setComments]             = useState([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [showComments, setShowComments]     = useState(false)
  const [commentText, setCommentText]       = useState('')
  const [sending, setSending]               = useState(false)
  const [commentCount, setCommentCount]     = useState(post.commentCount ?? 0)
  const [lightbox, setLightbox]             = useState(null)
  const [editing, setEditing]               = useState(false)
  const [editContent, setEditContent]       = useState(post.content ?? '')
  const [editChapter, setEditChapter]       = useState(post.chapterRef ?? '')
  const [editMedia, setEditMedia]           = useState(post.media ?? [])
  const [editUploading, setEditUploading]   = useState(false)
  const [saving, setSaving]                 = useState(false)
  const editFileRef                         = useRef(null)

  const isPostAuthor = post.author?._id?.toString() === currentUserId || post.author?.toString() === currentUserId

  const handleEditFiles = async e => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setEditUploading(true)
    const urls = await Promise.all(files.map(async file => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'post')
      const res  = await apiFetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      return data.url ?? null
    }))
    setEditMedia(prev => [...prev, ...urls.filter(Boolean)])
    setEditUploading(false)
    e.target.value = ''
  }

  const saveEdit = async () => {
    setSaving(true)
    const hasContent = editContent.trim().length > 0
    const hasMedia   = editMedia.length > 0
    const derivedType = editChapter ? 'milestone' : hasMedia && !hasContent ? 'media' : 'update'
    await apiFetch(`/api/projects/${projectSlug}/posts/${post._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:       derivedType,
        content:    editContent.trim(),
        chapterRef: editChapter || undefined,
        media:      editMedia,
      }),
    })
    setSaving(false)
    setEditing(false)
    onRefresh()
  }

  const toggleLike = async () => {
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => wasLiked ? c - 1 : c + 1)
    try {
      const res  = await apiFetch(`/api/projects/${projectSlug}/posts/${post._id}/like`, { method: 'POST' })
      const data = await res.json()
      setLiked(data.liked)
      setLikeCount(data.count)
    } catch {
      setLiked(wasLiked)
      setLikeCount(c => wasLiked ? c + 1 : c - 1)
    }
  }

  const loadComments = async () => {
    if (commentsLoaded) return
    const res  = await apiFetch(`/api/projects/${projectSlug}/posts/${post._id}/comments`)
    const data = await res.json()
    setComments(Array.isArray(data) ? data : [])
    setCommentsLoaded(true)
  }

  useEffect(() => { if (post.commentCount > 0) loadComments() }, [])

  const toggleComments = () => {
    setShowComments(v => !v)
    if (!commentsLoaded) loadComments()
  }

  const submitComment = async e => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSending(true)
    const res = await apiFetch(`/api/projects/${projectSlug}/posts/${post._id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText }),
    })
    if (res.ok) {
      const c = await res.json()
      setComments(prev => [...prev, c])
      setCommentCount(n => n + 1)
      setCommentText('')
    }
    setSending(false)
  }

  const deletePost = async () => {
    await apiFetch(`/api/projects/${projectSlug}/posts/${post._id}`, { method: 'DELETE' })
    onRefresh()
  }

  const deleteComment = async (commentId) => {
    await apiFetch(`/api/projects/${projectSlug}/posts/${post._id}/comments/${commentId}`, { method: 'DELETE' })
    setComments(prev => prev.filter(c => c._id !== commentId))
    setCommentCount(n => n - 1)
  }

  return (
    <>
    <div className="border-b border-[#111]" style={{ borderLeft: `2px solid ${cfg.border}` }}>
      <div className="px-3.5 py-3.5">

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-[7px] tracking-[0.15em] uppercase px-2 py-0.5 border rounded-full"
            style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>
            {cfg.label}
          </span>
          {post.chapterRef && (
            <span className="font-mono text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>— {post.chapterRef}</span>
          )}
          <span className="font-mono text-[7px] ml-auto" style={{ color: 'rgba(255,255,255,0.4)' }}>{ago(post.createdAt)}</span>
          {isPostAuthor && !editing && (
            <>
              <button onClick={() => setEditing(true)}
                className="font-mono text-[7px] tracking-[0.1em] uppercase"
                style={{ color: 'rgba(255,255,255,0.8)' }}>edit</button>
              <button onClick={deletePost}>
                <img src="/portal/icons/trash-bin.png" alt="delete" style={{ width: 12, height: 12, filter: 'invert(21%) sepia(95%) saturate(7000%) hue-rotate(342deg) brightness(85%) contrast(115%)' }} />
              </button>
            </>
          )}
        </div>

        {/* Inline edit form */}
        {editing && (
          <div className="flex flex-col gap-2 mb-3 p-3" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
            <input ref={editFileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleEditFiles} />
            <ChapterDropdown chapters={chapters} value={editChapter} onChange={setEditChapter}
              onChapterAdded={async title => {
                const updated = [...(chapters ?? []), { title, status: 'todo' }]
                await apiFetch(`/api/projects/${projectSlug}/chapters`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chapters: updated }),
                })
                onRefresh()
              }} />
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
              className="w-full font-space text-[12px] px-3 py-2.5 focus:outline-none resize-none placeholder-white/40"
              style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', color: 'rgba(255,255,255,0.9)' }} />
            {editMedia.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {editMedia.map((url, i) => (
                  <div key={i} className="relative">
                    <MediaThumb url={url} className="object-cover" style={{ width: 56, height: 56 }} />
                    <button type="button" onClick={() => setEditMedia(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center">
                      <img src="/portal/icons/cross-y.png" alt="remove" className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => editFileRef.current?.click()} disabled={editUploading}
                className="font-mono text-[7px] tracking-[0.15em] uppercase px-3 py-1.5 border disabled:opacity-40"
                style={{ borderColor: editUploading ? '#00C853' : '#FDC214', color: editUploading ? '#00C853' : '#FDC214' }}>
                {editUploading ? 'Uploading…' : '+ Add media'}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)}
                  className="font-mono text-[7px] tracking-[0.15em] uppercase px-3 py-1.5"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Cancel</button>
                <button type="button" onClick={saveEdit} disabled={saving}
                  className="font-mono text-[7px] tracking-[0.15em] uppercase px-4 py-1.5 rounded-full disabled:opacity-40"
                  style={{ background: '#FDC214', color: '#0a0a0a' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Content */}
        {post.content && (
          <p className="font-body font-normal text-[12px] leading-relaxed mb-3" style={{ color: '#ffffff' }}>
            {post.content}
          </p>
        )}

        {/* Media */}
        {post.media?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.media.slice(0, 4).map((url, i) => (
              isVideo(url)
                ? <VideoPlayer key={i} url={url} style={{ width: '100%', height: 320 }} />
                : <div key={i} className="overflow-hidden cursor-pointer" style={{ width: 72, height: 72 }}
                    onClick={() => setLightbox(url)}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button onClick={toggleLike}
            className="font-mono text-[8px] flex items-center gap-1 tracking-[0.1em]"
            style={{ color: liked ? '#D2042D' : 'rgba(255,255,255,0.4)' }}>
            <Heart size={13} fill={liked ? '#D2042D' : 'none'} /> {likeCount}
          </button>
          <button onClick={toggleComments}
            className="font-mono text-[8px] flex items-center gap-1 tracking-[0.1em]"
            style={{ color: showComments ? '#FDC214' : 'rgba(255,255,255,0.4)' }}>
            <MessageCircle size={13} /> {commentCount}
          </button>
        </div>

        {/* Inline comments */}
        {showComments && (
          <div className="mt-3">
            {comments.length > 0 && (
              <div className="p-2.5 mb-2">
                {comments.map((c, i) => {
                  const avatarUrl = c.author?.avatar?.url || c.author?.profileImage || null
                  return (
                  <div key={i} className="flex gap-2 mb-2 last:mb-0">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover shrink-0 mt-0.5" />
                      : <div className="w-4 h-4 rounded-full flex items-center justify-center font-mono text-[6px] font-bold shrink-0 mt-0.5"
                          style={{ background: '#1a1a1a', color: '#FDC214', border: '1px solid #2a2a2a' }}>
                          {c.author?.username?.[0]?.toUpperCase() ?? '?'}
                        </div>
                    }
                    <div className="flex-1">
                      <p className="font-mono text-[7px] mb-0.5" style={{ color: '#fff' }}>@{c.author?.username}</p>
                      <p className="font-space text-[10px] leading-relaxed" style={{ color: '#FDC214' }}>{c.content}</p>
                    </div>
                    {c.author?.username === currentUsername && (
                      <button onClick={() => deleteComment(c._id)} className="shrink-0 mt-0.5">
                        <img src="/portal/icons/trash-bin.png" alt="delete" style={{ width: 14, height: 14, filter: 'invert(21%) sepia(95%) saturate(7000%) hue-rotate(342deg) brightness(85%) contrast(115%)' }} />
                      </button>
                    )}
                  </div>
                )})}
              </div>
            )}
            <form onSubmit={submitComment} className="flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Add to the conversation…"
                className="flex-1 font-mono text-[9px] px-3 py-1.5 focus:outline-none placeholder-white"
                style={{ background: 'transparent', border: 'none', color: '#FDC214', letterSpacing: '0.05em' }} />
              <button type="submit" disabled={sending || !commentText.trim()}
                className="px-2.5 py-1.5 flex items-center"
                style={{ background: 'transparent' }}>
                <Send size={13} style={{ color: '#FDC214' }} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>

    {/* Lightbox */}
    {lightbox && (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.92)' }}
        onClick={() => setLightbox(null)}>
        {isVideo(lightbox)
          ? <VideoPlayer url={lightbox} style={{ width: '80vw', maxWidth: 960, height: '60vh' }} />
          : <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
        }
        <button className="absolute top-4 right-4" onClick={() => setLightbox(null)}>
          <img src="/portal/icons/cross-y.png" alt="close" className="w-5 h-5" />
        </button>
      </div>
    )}
    </>
  )
}

// ─── Add post form (author only) ──────────────────────────────────────────────
function AddPostForm({ projectSlug, chapters, onAdded }) {
  const persistChapter = async (title) => {
    const updated = [...(chapters ?? []), { title, status: 'todo' }]
    await apiFetch(`/api/projects/${projectSlug}/chapters`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapters: updated }),
    })
    onAdded()
  }
  const [open, setOpen]          = useState(false)
  const [content, setContent]    = useState('')
  const [mediaUrls, setMediaUrls] = useState([])   // uploaded CDN URLs
  const [uploading, setUploading] = useState(false)
  const [chapterRef, setChapRef] = useState('')
  const [sending, setSending]    = useState(false)
  const fileInputRef             = useRef(null)

  const hasText      = content.trim().length > 0
  const hasMedia     = mediaUrls.length > 0
  const hasMilestone = chapterRef.length > 0
  const derivedType  = hasMilestone ? 'milestone' : hasMedia ? 'media' : 'update'
  const canSubmit    = hasText || hasMedia

  const handleFiles = async e => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    const urls = await Promise.all(files.map(async file => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'post')
      const res  = await apiFetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      return data.url ?? null
    }))
    setMediaUrls(prev => [...prev, ...urls.filter(Boolean)])
    setUploading(false)
    e.target.value = ''
  }

  const removeMedia = idx => setMediaUrls(prev => prev.filter((_, i) => i !== idx))

  const submit = async e => {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    await apiFetch(`/api/projects/${projectSlug}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:       derivedType,
        content:    content.trim() || undefined,
        chapterRef: chapterRef || undefined,
        media:      mediaUrls,
      }),
    })
    setContent('')
    setMediaUrls([])
    setChapRef('')
    setSending(false)
    setOpen(false)
    onAdded()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full py-3 font-mono text-[8px] tracking-[0.2em] uppercase border border-dashed border-[#222] flex items-center justify-center gap-2"
      style={{ color: 'rgba(255,255,255,0.4)' }}>
      <Plus size={12} /> Post an update
    </button>
  )

  return (
    <div className="border border-[#1a1a1a] p-3.5" style={{ background: '#0d0d0d' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[7px] tracking-[0.15em] uppercase px-2 py-0.5 border rounded-full"
          style={{ color: '#FDC214', borderColor: 'rgba(253,194,20,0.4)', background: 'transparent' }}>
          {derivedType}
        </span>
        <button type="button" onClick={() => setOpen(false)}><X size={14} style={{ color: 'rgba(255,255,255,0.4)' }} /></button>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2.5">
        <ChapterDropdown chapters={chapters} value={chapterRef} onChange={setChapRef} onChapterAdded={persistChapter} />
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
          placeholder="Tell us about the project…"
          className="w-full font-space text-[12px] px-3 py-2.5 focus:outline-none resize-none placeholder-white/40"
          style={{ background: '#111', border: '1px solid #1a1a1a', color: 'rgba(255,255,255,0.9)' }} />

        {/* Media upload */}
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
        {mediaUrls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mediaUrls.map((url, i) => (
              <div key={i} className="relative">
                <MediaThumb url={url} className="w-16 h-16 object-cover" style={{ border: '1px solid #1a1a1a' }} />
                <button type="button" onClick={() => removeMedia(i)}
                  className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center">
                  <img src="/portal/icons/cross-y.png" alt="remove" className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="font-mono text-[7px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors disabled:opacity-40"
            style={{ borderColor: uploading ? '#00C853' : '#FDC214', color: uploading ? '#00C853' : '#FDC214' }}>
            {uploading ? 'Uploading…' : '+ Add media'}
          </button>
          <button type="submit" disabled={sending || !canSubmit}
            className="font-mono text-[8px] tracking-[0.2em] uppercase px-10 py-2.5 rounded-full disabled:opacity-40"
            style={{ background: '#FDC214', color: '#0a0a0a' }}>
            {sending ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Tab content ──────────────────────────────────────────────────────────────
function MilestonesTab({ project, posts, isAuthor, currentUserId, currentUsername, onRefresh }) {
  return (
    <div>
      {isAuthor && (
        <div className="p-3">
          <AddPostForm projectSlug={project.slug} chapters={project.chapters} onAdded={onRefresh} />
        </div>
      )}
      {posts.length === 0 ? (
        <div className="py-12 text-center">
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>NO POSTS YET.</p>
        </div>
      ) : (
        posts.map(p => (
          <PostCard key={p._id} post={p} projectSlug={project.slug} currentUserId={currentUserId} currentUsername={currentUsername} isAuthor={isAuthor} chapters={project.chapters} onRefresh={onRefresh} />
        ))
      )}
    </div>
  )
}

function AboutTab({ project, isAuthor, onRefresh }) {
  const [editing, setEditing]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [allTags, setAllTags]         = useState([])
  const [showCollabSuggest, setShowCollabSuggest]   = useState(false)
  const [collabInput, setCollabInput]               = useState('')

  useEffect(() => {
    apiFetch('/api/projects/tags').then(r => r.json()).then(d => {
      setAllTags(Array.isArray(d) ? d : [])
    })
  }, [])

  const [form, setForm]               = useState({
    title:                   project.title                  ?? '',
    tagline:                 project.tagline                ?? '',
    description:             project.description            ?? '',
    location:                project.location               ?? '',
    status:                  project.status                 ?? 'active',
    collaboratorsNeeded:     project.collaboratorsNeeded    ?? false,
    collaboratorDisciplines: project.collaboratorDisciplines ?? [],
    otherDisciplines:        project.otherDisciplines        ?? '',
  })

  useEffect(() => {
    setForm({
      title:                   project.title                  ?? '',
      tagline:                 project.tagline                ?? '',
      description:             project.description            ?? '',
      location:                project.location               ?? '',
      status:                  project.status                 ?? 'active',
      collaboratorsNeeded:     project.collaboratorsNeeded    ?? false,
      collaboratorDisciplines: project.collaboratorDisciplines ?? [],
      otherDisciplines:        project.otherDisciplines        ?? '',
    })
  }, [project])

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleDiscipline = d => setForm(f => ({
    ...f,
    collaboratorDisciplines: f.collaboratorDisciplines.includes(d)
      ? f.collaboratorDisciplines.filter(x => x !== d)
      : [...f.collaboratorDisciplines, d],
  }))

  const save = async () => {
    setSaving(true)
    await apiFetch(`/api/projects/${project.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:                   form.title.trim(),
        tagline:                 form.tagline.trim(),
        description:             form.description.trim(),
        location:                form.location.trim(),
        status:                  form.status,
        collaboratorsNeeded:     form.collaboratorsNeeded,
        collaboratorDisciplines: form.collaboratorsNeeded
          ? [
              ...form.collaboratorDisciplines.filter(d => d !== 'Other'),
              ...(form.collaboratorDisciplines.includes('Other')
                ? ['Other', ...form.otherDisciplines.split(',').map(t => t.trim()).filter(Boolean)]
                : []),
            ]
          : [],
      }),
    })
    setSaving(false)
    setEditing(false)
    onRefresh()
  }

  if (editing) return (
    <div className="px-3.5 py-4 flex flex-col gap-3">
      {[
        { key: 'title',       label: 'Title',       type: 'input' },
        { key: 'tagline',     label: 'Headline',    type: 'input' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'location',    label: 'Location',    type: 'input' },
      ].map(({ key, label, type }) => (
        <div key={key}>
          <p className="font-mono text-[7px] tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
          {type === 'textarea'
            ? <textarea value={form[key]} onChange={e => handle(key, e.target.value)} rows={4}
                className="w-full font-space text-[12px] px-3 py-2 focus:outline-none resize-none placeholder-white/40"
                style={{ background: '#111', border: '1px solid #1a1a1a', color: 'rgba(255,255,255,0.9)' }} />
            : <input value={form[key]} onChange={e => handle(key, e.target.value)}
                className="w-full font-space text-[12px] px-3 py-2 focus:outline-none"
                style={{ background: '#111', border: '1px solid #1a1a1a', color: 'rgba(255,255,255,0.9)' }} />
          }
        </div>
      ))}
      {/* Status */}
      <div>
        <p className="font-mono text-[7px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Status</p>
        <div className="flex gap-1.5">
          {['active', 'completed'].map(opt => {
            const isActive = form.status === opt
            const activeColor = opt === 'completed' ? '#FF0000' : '#008000'
            return (
              <button key={opt} type="button" onClick={() => handle('status', opt)}
                className="font-mono text-[7px] tracking-[0.1em] uppercase px-3 py-1.5 border rounded-full transition-colors"
                style={{
                  borderColor: isActive ? activeColor : '#333',
                  color:       isActive ? activeColor : 'rgba(255,255,255,0.4)',
                  background:  'transparent',
                }}>
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      {/* Collaborators needed */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[7px] tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Collaborators Needed</p>
          <div className="flex gap-1.5">
            {['Yes', 'No'].map(opt => {
              const active = opt === 'Yes' ? form.collaboratorsNeeded : !form.collaboratorsNeeded
              return (
                <button key={opt} type="button" onClick={() => handle('collaboratorsNeeded', opt === 'Yes')}
                  className="font-mono text-[7px] tracking-[0.1em] uppercase px-3 py-1 border rounded-full transition-colors"
                  style={{
                    borderColor: active ? '#FDC214' : '#333',
                    color:       active ? '#FDC214' : 'rgba(255,255,255,0.4)',
                    background:  'transparent',
                  }}>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
        <div className={`flex flex-wrap gap-1.5 transition-opacity ${form.collaboratorsNeeded ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
          {allTags.map(d => {
            const selected = form.collaboratorDisciplines.includes(d)
            return (
              <button key={d} type="button" onClick={() => toggleDiscipline(d)}
                className="font-mono text-[7px] tracking-[0.1em] uppercase px-2.5 py-1 border rounded-full transition-colors"
                style={{
                  borderColor: selected ? '#FDC214' : '#333',
                  color:       selected ? '#FDC214' : 'rgba(255,255,255,0.4)',
                  background:  'transparent',
                }}>
                {pluralise(d)}
              </button>
            )
          })}
          {form.collaboratorDisciplines.includes('Other') && (
            <div className="w-full mt-2 flex flex-col gap-2">
              <div className="relative">
                <input
                  placeholder="Search tags…"
                  value={collabInput}
                  onChange={e => { setCollabInput(e.target.value); setShowCollabSuggest(true) }}
                  onFocus={() => setShowCollabSuggest(true)}
                  onBlur={() => setTimeout(() => setShowCollabSuggest(false), 150)}
                  onKeyDown={e => { if (e.key === 'Escape') setShowCollabSuggest(false) }}
                  className="w-full font-mono text-[9px] px-3 py-2 focus:outline-none placeholder-white/30"
                  style={{ background: '#111', border: '1px solid #1a1a1a', color: 'rgba(255,255,255,0.9)' }}
                />
                {showCollabSuggest && (() => {
                  const selected = form.otherDisciplines ? form.otherDisciplines.split(',').map(x => x.trim()).filter(Boolean) : []
                  const filtered = allTags.filter(t =>
                    !selected.includes(t) &&
                    !form.collaboratorDisciplines.includes(t) &&
                    (collabInput === '' || t.toLowerCase().includes(collabInput.toLowerCase()))
                  ).slice(0, 8)
                  return filtered.length > 0 ? (
                    <div className="absolute left-0 right-0 z-50 mt-0.5"
                      style={{ background: '#111', border: '1px solid #1a1a1a' }}>
                      {filtered.map(t => (
                        <button key={t} type="button"
                          onMouseDown={() => {
                            const current = form.otherDisciplines ? form.otherDisciplines.split(',').map(x => x.trim()).filter(Boolean) : []
                            handle('otherDisciplines', [...current, t].join(', '))
                            setCollabInput('')
                            setShowCollabSuggest(false)
                          }}
                          className="w-full text-left px-3 py-2 font-mono text-[9px] tracking-[0.05em]"
                          style={{ borderTop: '1px solid #1a1a1a', color: 'rgba(255,255,255,0.8)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FDC214'; e.currentTarget.style.color = '#0a0a0a' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={() => setEditing(false)}
          className="font-mono text-[7px] tracking-[0.15em] uppercase px-3 py-1.5"
          style={{ color: 'rgba(255,255,255,0.3)' }}>Cancel</button>
        <button onClick={save} disabled={saving}
          className="font-mono text-[7px] tracking-[0.15em] uppercase px-5 py-1.5 rounded-full disabled:opacity-40"
          style={{ background: '#FDC214', color: '#0a0a0a' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="px-3.5 py-4">
      <div className="flex items-start justify-between mb-3">
        {project.tagline && (
          <p className="font-head text-[14px] leading-snug uppercase" style={{ color: '#FDC214', letterSpacing: '2px' }}>
            {project.tagline}
          </p>
        )}
        {isAuthor && (
          <button onClick={() => setEditing(true)}
            className="font-mono text-[7px] tracking-[0.1em] uppercase shrink-0 ml-3"
            style={{ color: 'rgba(255,255,255,0.8)' }}>edit</button>
        )}
      </div>
      <p className="font-mono text-[8px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Description</p>
      <p className="font-body text-[13px] leading-relaxed mb-5" style={{ color: '#ffffff' }}>
        {project.description || 'No description yet.'}
      </p>
      <div className="border-t border-[#141414] pt-4 grid grid-cols-2 gap-4 mb-5">
        {[
          ['Status',   project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : '—', project.status === 'completed' ? 'red' : 'green'],
          ['Location', project.location || '—',                 'white'],
        ].map(([label, val, color]) => (
          <div key={label}>
            <p className="font-mono text-[7px] tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
            <p className="font-body text-[12px] font-bold" style={{ color: color === 'yellow' ? '#FDC214' : color === 'green' ? '#008000' : color === 'red' ? '#FF0000' : '#ffffff' }}>{val}</p>
          </div>
        ))}
      </div>
      {project.status !== 'completed' && project.collaboratorsNeeded && project.collaboratorDisciplines?.length > 0 && (
        <div className="border-t border-[#141414] pt-4">
          <p className="font-mono text-[7px] tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Looking for collaborators</p>
          <div className="flex flex-wrap gap-1.5">
            {project.collaboratorDisciplines.map(d => (
              <span key={d} className="font-head text-[7px] uppercase px-2.5 py-1 border rounded-full"
                style={{ borderColor: '#FDC214', color: '#FDC214', background: 'transparent', letterSpacing: '2px' }}>
                {pluralise(d)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MediaTab({ posts, isAuthor, projectSlug, onRefresh }) {
  const [lightbox, setLightbox] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const items = posts.flatMap(p => (p.media ?? []).map(url => ({ url, postId: p._id, post: p })))

  const handleDelete = async (url, postId, post) => {
    setDeleting(url)
    const updatedMedia = (post.media ?? []).filter(m => m !== url)
    await apiFetch(`/api/projects/${projectSlug}/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media: updatedMedia }),
    })
    setDeleting(null)
    onRefresh()
  }

  return (
    <>
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>NO MEDIA YET.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[1px] p-[1px]">
          {items.map(({ url, postId, post }, i) => (
            <div key={i} className="relative group overflow-hidden" style={{ aspectRatio: '1' }}>
              <button type="button" onClick={() => setLightbox(url)} className="w-full h-full block">
                <MediaThumb url={url} className="w-full h-full object-cover" />
              </button>
              {isAuthor && (
                <button type="button"
                  onClick={() => handleDelete(url, postId, post)}
                  disabled={deleting === url}
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'transparent' }}>
                  {deleting === url
                    ? <span style={{ color: '#FF0000', fontSize: 10 }}>…</span>
                    : <div style={{
                        width: 20, height: 20,
                        backgroundColor: '#CC0000',
                        WebkitMaskImage: 'url(/portal/icons/trash-bin.png)',
                        maskImage: 'url(/portal/icons/trash-bin.png)',
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                      }} />
                  }
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 font-mono text-white/60 hover:text-white text-xl">✕</button>
        </div>
      )}
    </>
  )
}

function TeamTab({ project, router, isAuthor }) {
  const cfg = discCfg(project.discipline)
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const [dirUsers, setDirUsers]           = useState([])
  const [dirQuery, setDirQuery]           = useState('')
  const [selected, setSelected]           = useState(null)
  const [role, setRole]                   = useState('')
  const [sending, setSending]             = useState(false)
  const [sentIds, setSentIds]             = useState(new Set())
  const [pendingInvites, setPendingInvites] = useState([])

  useEffect(() => {
    if (!isAuthor || !project._id) return
    apiFetch(`/api/projects/${project._id}/invite`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setPendingInvites(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [isAuthor, project._id])

  function openDirectory() {
    setDirectoryOpen(true)
    if (!dirUsers.length) {
      apiFetch('/api/directory')
        .then(r => r.ok ? r.json() : [])
        .then(data => setDirUsers(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }

  function closeDirectory() {
    setDirectoryOpen(false)
    setSelected(null)
    setRole('')
    setDirQuery('')
  }

  async function sendInvite() {
    if (!selected) return
    setSending(true)
    try {
      const res = await apiFetch(`/api/projects/${project._id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id, role }),
      })
      if (res.ok) {
        setSentIds(prev => new Set([...prev, selected.id]))
        setPendingInvites(prev => [...prev, { user: { username: selected.username, avatar: { url: selected.avatar }, profileImage: selected.avatar }, role }])
        closeDirectory()
      }
    } finally {
      setSending(false)
    }
  }

  const collaboratorIds = new Set([
    ...(project.collaborators?.map(c => c.user?._id?.toString() ?? c.user?.toString()) ?? []),
    project.creator?._id?.toString() ?? project.creator?.toString(),
  ])
  const pendingIds = new Set([
    ...pendingInvites.map(n => n.user?._id?.toString() ?? ''),
    ...[...sentIds],
  ])

  const filteredDir = dirUsers.filter(u => {
    if (collaboratorIds.has(u.id?.toString())) return false
    if (!dirQuery) return true
    const q = dirQuery.toLowerCase()
    return u.name?.toLowerCase().includes(q)
      || u.username?.toLowerCase().includes(q)
      || (u.tags ?? []).some(t => t.toLowerCase().includes(q))
      || (u.bio ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="px-3.5 py-4">
      <p className="font-mono text-[8px] tracking-[0.2em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Member</p>
      <div className="flex items-center gap-3 mb-5">
        {project.creator?.avatar?.url || project.creator?.profileImage
          ? <img src={project.creator.avatar?.url ?? project.creator.profileImage}
              alt={project.creator.username} className="w-10 h-10 rounded-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          : <div className="w-10 h-10 rounded-full flex items-center justify-center font-mono text-[12px] font-bold"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
              {project.creator?.username?.[0]?.toUpperCase()}
            </div>
        }
        <div>
          <p className="font-body text-[13px] font-normal text-white">@{project.creator?.username}</p>
          <p className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {project.discipline}{project.location ? ` ${project.location}` : ''}
          </p>
        </div>
      </div>

      {(project.collaborators?.length > 0 || pendingInvites.length > 0) && (
        <>
          <p className="font-mono text-[8px] tracking-[0.2em] uppercase mb-3 border-t border-[#141414] pt-4"
            style={{ color: 'rgba(255,255,255,0.4)' }}>Collaborators</p>
          {project.collaborators?.map((c, i) => {
            const avatarUrl = c.user?.avatar?.url || c.user?.profileImage || null
            return (
              <div key={i} className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-mono text-[9px] font-bold"
                  style={{ background: '#1a1a1a', color: 'rgba(255,255,255,0.4)', border: '1px solid #2a2a2a' }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none' }} />
                    : (c.user?.username?.[0]?.toUpperCase() ?? '?')
                  }
                </div>
                <div>
                  <p className="font-space text-[11px] font-bold text-white">@{c.user?.username}</p>
                  {c.role && <p className="font-mono text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.role}</p>}
                </div>
              </div>
            )
          })}
          {isAuthor && pendingInvites.map((inv, i) => {
            const invAvatarUrl = inv.user?.avatar?.url || inv.user?.profileImage || null
            return (
            <div key={`pending-${i}`} className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-mono text-[9px] font-bold"
                style={{ background: '#1a1a00', color: '#FDC214', border: '1px solid rgba(253,194,20,0.25)' }}>
                {invAvatarUrl
                  ? <img src={invAvatarUrl} alt="" className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.style.display = 'none' }} />
                  : (inv.user?.username?.[0]?.toUpperCase() ?? '?')
                }
              </div>
              <div className="flex-1">
                <p className="font-space text-[11px] font-bold text-white">@{inv.user?.username}</p>
                {inv.role && <p className="font-mono text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{inv.role}</p>}
              </div>
              <span className="font-mono text-[6px] tracking-widest uppercase px-1.5 py-0.5"
                style={{ color: '#FDC214', border: '1px solid #FDC214', background: 'transparent', borderRadius: 50 }}>
                Invited
              </span>
            </div>
          )})}
        </>
      )}

      {project.openCollabSlots?.filter(s => !s.filled).length > 0 && (
        <>
          <p className="font-mono text-[8px] tracking-[0.2em] uppercase mb-3 border-t border-[#141414] pt-4"
            style={{ color: 'rgba(255,255,255,0.4)' }}>Open collab slots</p>
          {project.openCollabSlots.filter(s => !s.filled).map((slot, i) => (
            <div key={i} className="border border-[#1a1a1a] p-2.5 mb-2" style={{ background: '#0d0d0d' }}>
              <p className="font-space text-[11px] font-bold mb-0.5" style={{ color: '#e8e8e8' }}>{slot.role}</p>
              {slot.description && (
                <p className="font-space text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{slot.description}</p>
              )}
            </div>
          ))}
        </>
      )}

      {isAuthor && (
        <button onClick={openDirectory}
          className="mt-4 w-full font-mono text-[8px] tracking-[0.15em] uppercase py-3 border border-dashed border-[#222] flex items-center justify-center gap-2"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Plus size={12} /> Add members to your project
        </button>
      )}

      {directoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={closeDirectory}>
          <div className="w-full max-w-sm mx-4 bg-black px-4 pt-5 pb-6"
            style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: '#FDC214' }}>Add Collaborator</p>
              <button onClick={closeDirectory} className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                <img src="/portal/icons/cross-y.png" alt="close" style={{ width: 12, height: 12, objectFit: 'contain' }} />
              </button>
            </div>

            <input
              value={dirQuery}
              onChange={e => setDirQuery(e.target.value)}
              placeholder="SEARCH MEMBERS..."
              className="w-full bg-transparent border border-[#FDC214] font-mono text-[9px] tracking-widest text-white px-4 py-2 mb-3 outline-none dir-search" style={{ borderRadius: 50 }}
            />

            <div className="overflow-y-auto flex-1 mb-3">
              {filteredDir.length === 0 && (
                <p className="font-mono text-[8px] text-center py-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {dirUsers.length === 0 ? 'Loading...' : 'No members found'}
                </p>
              )}
              {filteredDir.map(u => {
                const isPending = pendingIds.has(u.id?.toString())
                const isSel = selected?.id === u.id
                return (
                  <button key={u.id}
                    onClick={() => { if (isPending) return; setSelected(isSel ? null : u); setRole('') }}
                    className="w-full flex items-start gap-2.5 py-2.5 px-2 text-left mb-0.5"
                    style={{
                      background: 'transparent',
                      border: isSel ? '1px solid rgba(253,194,20,0.25)' : '1px solid transparent',
                      opacity: isPending ? 0.4 : 1,
                      cursor: isPending ? 'default' : 'pointer',
                    }}>
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-[#1a1a1a] mt-0.5">
                      {u.avatar
                        ? <img src={u.avatar} alt="" className="w-full h-full object-cover"
                            onError={e => { e.currentTarget.style.display = 'none' }} />
                        : <div className="w-full h-full flex items-center justify-center font-mono text-[9px]"
                            style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {u.username?.[0]?.toUpperCase()}
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-head text-[10px] truncate" style={{ color: '#FDC214', letterSpacing: '1px' }}>{u.name}</p>
                      <p className="font-mono text-[7px] mb-1" style={{ color: '#fff' }}>@{u.username}</p>
                      {(u.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(u.tags ?? []).map(t => (
                            <span key={t} className="font-mono text-[6px] tracking-wide px-1.5 py-0.5"
                              style={{ border: '1px solid #FDC214', color: '#FDC214', background: 'transparent', borderRadius: 50 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isPending && (
                      <span className="font-mono text-[6px] tracking-widest flex-shrink-0 mt-0.5" style={{ color: '#FDC214' }}>Invited</span>
                    )}
                  </button>
                )
              })}
            </div>

            {selected && (
              <div className="border-t border-[#1a1a1a] pt-3 flex-shrink-0">
                <p className="font-mono text-[7px] mb-2.5" style={{ color: '#fff' }}>
                  Inviting <span style={{ color: '#FDC214' }}>@{selected.username}</span>
                </p>

                {(selected.tags ?? []).length > 0 && (
                  <>
                    <p className="font-mono text-[6px] tracking-[0.15em] uppercase mb-1.5" style={{ color: '#fff' }}>
                      Select their contribution
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(selected.tags ?? []).map(t => {
                        const active = role === t
                        return (
                          <button key={t}
                            onClick={() => setRole(active ? '' : t)}
                            className="font-mono text-[7px] tracking-wide px-2 py-1"
                            style={{
                              border: '1px solid #FDC214',
                              background: active ? '#FDC214' : 'transparent',
                              color: active ? '#000' : '#FDC214',
                              cursor: 'pointer',
                              borderRadius: 50,
                            }}>
                            {t}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                <input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder={(selected.tags ?? []).length > 0 ? 'Or type a custom role...' : 'Role (e.g. Cinematographer)'}
                  className="w-full bg-transparent border border-[#222] font-mono text-[9px] text-white px-3 py-2 mb-3 outline-none placeholder-white"
                />

                <button onClick={sendInvite} disabled={sending}
                  className="w-full font-mono text-[8px] tracking-[0.15em] uppercase py-2.5"
                  style={{ background: '#FDC214', color: '#000', opacity: sending ? 0.6 : 1, cursor: sending ? 'default' : 'pointer', borderRadius: 50 }}>
                  {sending ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const TABS = ['Milestones', 'Details', 'Media', 'Team']

export default function ProjectDetailPage() {
  const { id }            = useParams()
  const router            = useRouter()
  const { data: session } = useSession()

  const [project, setProject]           = useState(null)
  const [posts, setPosts]               = useState([])
  const [tab, setTab]                   = useState('Milestones')
  const [following, setFollowing]       = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [collabSent, setCollabSent]     = useState(false)
  const [collabDeclined, setCollabDeclined] = useState(false)
  const [collabModal, setCollabModal]   = useState(false)
  const [collabMessage, setCollabMessage] = useState('')
  const [collabSending, setCollabSending] = useState(false)

  const load = async () => {
    const [projRes, postsRes] = await Promise.all([
      apiFetch(`/api/projects/${id}`),
      apiFetch(`/api/projects/${id}/posts`),
    ])
    if (!projRes.ok) return
    const proj      = await projRes.json()
    const postsData = postsRes.ok ? await postsRes.json() : []
    setProject(proj)
    setPosts(Array.isArray(postsData) ? postsData : [])
    const uid = session?.user?.id
    setFollowing(proj.followers?.some(f => f === uid || f?._id === uid || f?.toString() === uid))
    setFollowerCount(proj.followerCount ?? 0)
  }

  useEffect(() => { if (id) load() }, [id, session])

  useEffect(() => {
    if (!project?._id) return
    apiFetch('/api/notifications').then(r => r.json()).then(data => {
      const declined = (data.notifications ?? []).some(
        n => n.type === 'collab_request' && n.status === 'declined' && (n.project?._id ?? n.project)?.toString() === project._id.toString()
      )
      setCollabDeclined(declined)
    })
  }, [project?._id])

  const sendCollab = async () => {
    setCollabSending(true)
    try {
      const res = await apiFetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: creatorId, context: collabMessage.trim() || undefined, source: 'project', projectId: project._id }),
      })
      if (res.ok) {
        setCollabSent(true)
        setCollabModal(false)
        setCollabMessage('')
      }
    } finally {
      setCollabSending(false)
    }
  }

  const toggleFollow = async () => {
    const res  = await apiFetch(`/api/projects/${id}/follow`, { method: 'POST' })
    const data = await res.json()
    setFollowing(data.following)
    setFollowerCount(data.count)
  }

  const toggleChapter = async (idx, newStatus) => {
    const updated = project.chapters.map((ch, i) => i === idx
      ? { ...ch, status: newStatus, completedAt: newStatus === 'done' ? new Date() : undefined }
      : ch
    )
    const res  = await apiFetch(`/api/projects/${id}/chapters`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapters: updated }),
    })
    const data = await res.json()
    setProject(prev => ({ ...prev, chapters: data.chapters }))
  }

  // ── Cover editing ─────────────────────────────────────────────────────────────
  const coverInputRef   = useRef(null)
  const [coverEditing, setCoverEditing]     = useState(false)
  const [coverPreview, setCoverPreview]     = useState(null)
  const [coverFile, setCoverFile]           = useState(null)
  const [coverPos, setCoverPos]             = useState({ x: 50, y: 50 })
  const [coverSaving, setCoverSaving]       = useState(false)
  const coverDragging   = useRef(false)
  const coverDragAnchor = useRef({})

  useEffect(() => {
    const move = e => {
      if (!coverDragging.current) return
      const { mx, my, px, py } = coverDragAnchor.current
      setCoverPos({
        x: Math.max(0, Math.min(100, px + (e.clientX - mx) / 2.5)),
        y: Math.max(0, Math.min(100, py + (e.clientY - my) / 2.5)),
      })
    }
    const up = () => { coverDragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [])

  const pickCover = file => {
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setCoverEditing(true)
  }

  const saveCover = async () => {
    setCoverSaving(true)
    let coverImage = project.coverImage ?? ''
    if (coverFile) {
      const fd = new FormData()
      fd.append('file', coverFile)
      fd.append('type', 'cover')
      const upRes  = await apiFetch('/api/upload', { method: 'POST', body: fd })
      const upData = await upRes.json()
      coverImage = upData.url ?? coverImage
    }
    const position = `${coverPos.x.toFixed(1)}% ${coverPos.y.toFixed(1)}%`
    await apiFetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverImage, coverImagePosition: position }),
    })
    setProject(p => ({ ...p, coverImage, coverImagePosition: position }))
    setCoverEditing(false)
    setCoverFile(null)
    setCoverPreview(null)
    setCoverSaving(false)
  }

  const cancelCover = () => {
    setCoverEditing(false)
    setCoverFile(null)
    setCoverPreview(null)
  }

  if (!project) return (
    <div className="-m-8 flex items-center justify-center min-h-screen" style={{ background: '#0a0a0a' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>LOADING...</span>
    </div>
  )

  const creatorId = project.creator?._id?.toString() ?? project.creator?.toString() ?? ''
  const isAuthor  = !!session?.user?.id && creatorId === session.user.id

  const cfg      = discCfg(project.discipline)
  const chapters = project.chapters ?? []
  const running  = runningDuration(project.createdAt)

  return (
    <div className="-m-8 flex flex-col min-h-screen font-space" style={{ background: '#0a0a0a', color: '#e8e8e8' }}>

      {/* Hero */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => pickCover(e.target.files?.[0])} />

      <div className="relative overflow-hidden" style={{ height: 200 }}>
        {coverEditing && coverPreview ? (
          <img src={coverPreview} alt="cover preview" draggable={false}
            onMouseDown={e => {
              e.preventDefault()
              coverDragging.current = true
              coverDragAnchor.current = { mx: e.clientX, my: e.clientY, px: coverPos.x, py: coverPos.y }
            }}
            className="w-full h-full select-none"
            style={{ objectFit: 'cover', objectPosition: `${coverPos.x}% ${coverPos.y}%`, cursor: 'grab' }}
          />
        ) : (
          <HeroArt project={project} />
        )}

        {/* Back button */}
        <button onClick={() => router.back()}
          className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center">
          <ArrowLeft size={16} style={{ color: '#FDC214' }} />
        </button>

        {/* Edit cover — author only */}
        {isAuthor && !coverEditing && (
          <button onClick={() => coverInputRef.current?.click()}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center">
            <Camera size={14} style={{ color: '#FDC214' }} />
          </button>
        )}
        {isAuthor && coverEditing && (
          <div className="absolute top-3 right-3 z-10 flex gap-1.5">
            <button onClick={() => coverInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center">
              <Camera size={14} style={{ color: '#FDC214' }} />
            </button>
            <button onClick={cancelCover}
              className="w-8 h-8 flex items-center justify-center border border-[#444]"
              style={{ background: 'rgba(10,10,10,0.75)' }}>
              <X size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
            <button onClick={saveCover} disabled={coverSaving}
              className="font-mono text-[7px] tracking-[0.15em] uppercase px-3 h-8 border transition-colors disabled:opacity-50"
              style={{ background: '#FDC214', borderColor: '#FDC214', color: '#0a0a0a' }}>
              {coverSaving ? '…' : 'Save'}
            </button>
          </div>
        )}
        {coverEditing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Drag to reposition
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-2.5 flex items-end justify-between"
          style={{ background: 'linear-gradient(transparent, rgba(10,10,10,0.95))' }}>
          <h1 className="font-head text-[40px] leading-tight" style={{ color: '#FDC214', letterSpacing: '2px' }}>
            {project.title}
          </h1>
        </div>
      </div>

      {/* Meta bar */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#141414]">
        {project.creator?.avatar?.url || project.creator?.profileImage
          ? <img src={project.creator.avatar?.url ?? project.creator.profileImage}
              alt={project.creator.username} className="w-8 h-8 rounded-full object-cover shrink-0"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          : <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
              {project.creator?.username?.[0]?.toUpperCase()}
            </div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-body text-[13px] font-normal text-white leading-tight">
            @{project.creator?.username}
          </p>
          <p className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {project.discipline}{project.location ? ` ${project.location}` : ''}
          </p>
        </div>
        {!isAuthor && (
          <button onClick={toggleFollow}
            className="font-mono text-[8px] tracking-[0.15em] uppercase px-3.5 py-1.5 border shrink-0 transition-colors"
            style={{
              borderColor: following ? '#008000' : 'rgba(0,128,0,0.35)',
              color:       following ? '#0a0a0a' : '#008000',
              background:  following ? '#008000' : 'transparent',
            }}>
            {following ? '✓ Following' : '+ Follow'}
          </button>
        )}
        {!isAuthor && creatorId && (
          <button
            disabled={collabSent || collabDeclined}
            onClick={() => setCollabModal(true)}
            className="font-mono text-[8px] tracking-[0.15em] uppercase px-3.5 py-1.5 border shrink-0 transition-colors"
            style={{
              borderColor: collabDeclined ? 'rgba(210,4,45,0.3)' : `${collabSent ? 'rgba(253,194,20,0.4)' : '#FDC214'}`,
              color:       collabDeclined ? '#D2042D80' : collabSent ? '#FDC214' : '#0a0a0a',
              background:  collabDeclined ? 'transparent' : collabSent ? 'transparent' : '#FDC214',
              opacity:     collabSent || collabDeclined ? 0.7 : 1,
              cursor:      collabSent || collabDeclined ? 'default' : 'pointer',
            }}>
            {collabDeclined ? 'Declined' : collabSent ? 'Requested ✓' : 'Collab'}
          </button>
        )}
      </div>

      {collabModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="border rounded-2xl w-full max-w-md p-6" style={{ borderColor: '#FDC214', background: '#0a0a0a' }}>
            <div className="relative flex items-center justify-center mb-6">
              <h2 className="font-head text-white text-lg tracking-widest uppercase">Send Collab Request</h2>
              <button onClick={() => setCollabModal(false)} className="absolute right-0">
                <img src="/portal/icons/cross-y.png" alt="close" style={{ width: 18, height: 18, opacity: 0.6 }} />
              </button>
            </div>
            <p className="font-mono text-[9px] tracking-[0.1em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              To @{project.creator?.username} — {project.title}
            </p>
            <textarea
              value={collabMessage}
              onChange={e => setCollabMessage(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Add a message with your request (optional)…"
              className="w-full bg-transparent rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none resize-none placeholder-white/40"
              style={{ border: '1px solid #FDC214' }}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setCollabModal(false)}
                className="flex-1 font-mono text-[9px] tracking-[0.15em] uppercase px-4 py-2.5 border transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: 9999 }}>
                Cancel
              </button>
              <button onClick={sendCollab} disabled={collabSending}
                className="flex-1 font-mono text-[9px] tracking-[0.15em] uppercase px-4 py-2.5 transition-colors disabled:opacity-50"
                style={{ background: '#FDC214', color: '#0a0a0a', borderRadius: 9999 }}>
                {collabSending ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex border-b border-[#141414]">
        <div className="flex-1 flex flex-col items-center py-2.5 gap-0.5 border-r border-[#141414]">
          <span className="font-space font-black text-[16px] leading-none" style={{ letterSpacing: '-0.02em', color: '#fff' }}>
            {followerCount}
          </span>
          <span className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Followers</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-2.5 gap-0.5 border-r border-[#141414]">
          <span className="font-space font-black text-[16px] leading-none" style={{ letterSpacing: '-0.02em', color: '#fff' }}>
            {posts.length}
          </span>
          <span className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Posts</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-2.5 gap-0.5">
          <span className="font-space font-black text-[16px] leading-none" style={{ letterSpacing: '-0.02em', color: '#fff' }}>
            {running}
          </span>
          <span className="font-mono text-[7px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Running</span>
        </div>
      </div>

      {/* Chapter progress */}
      {chapters.length > 0 && (
        <ChapterProgress chapters={chapters} isAuthor={isAuthor} onToggle={toggleChapter} />
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#141414]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 font-mono text-[8px] tracking-[0.15em] uppercase border-b-2 transition-colors"
            style={{
              color:       tab === t ? '#FDC214' : 'rgba(255,255,255,0.4)',
              borderColor: tab === t ? '#FDC214' : 'transparent',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 pb-4">
        {tab === 'Milestones' && <MilestonesTab project={project} posts={posts} isAuthor={isAuthor} currentUserId={session?.user?.id} currentUsername={session?.user?.username} onRefresh={load} />}
        {tab === 'Details' && <AboutTab project={project} isAuthor={isAuthor} onRefresh={load} />}
        {tab === 'Media'   && <MediaTab posts={posts} isAuthor={isAuthor} projectSlug={id} onRefresh={load} />}
        {tab === 'Team'    && <TeamTab  project={project} router={router} isAuthor={isAuthor} />}
      </div>

    </div>
  )
}
