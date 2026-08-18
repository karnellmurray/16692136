'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Search, Plus, User, Users, Heart, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// ─── Discipline colour config ─────────────────────────────────────────────────
const DISC = {
  Music:        { color: '#ff4444', bg: '#1a0000' },
  Film:         { color: '#008000', bg: '#001a0d' },
  Photography:  { color: '#00aaff', bg: '#00081a' },
  Fashion:      { color: '#ff8833', bg: '#1a0800' },
  'Visual Art': { color: '#00aaff', bg: '#00081a' },
  Design:       { color: '#e8ff00', bg: '#1a1700' },
  Writing:      { color: '#aaaaaa', bg: '#0f0f0f' },
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

const STATIC_FILTERS = ['Explore', 'My Projects', 'Following']

// ─── SVG art per discipline ───────────────────────────────────────────────────
function CardArt({ discipline, height = 90 }) {
  const cfg = discCfg(discipline)
  if (discipline === 'Music') return (
    <svg width="100%" height={height} viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="90" fill={cfg.bg} />
      {[20,45,70,95,120,145,170].map((x, i) => (
        <rect key={x} x={x} y={10 + (i % 3) * 8} width="18" height={70 - (i % 3) * 8}
          fill={cfg.color} opacity={0.08 + (i % 3) * 0.04} />
      ))}
    </svg>
  )
  if (discipline === 'Film') return (
    <svg width="100%" height={height} viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="90" fill={cfg.bg} />
      <path d="M0 45 Q50 15 100 45 Q150 75 200 45" fill="none" stroke={cfg.color} strokeWidth="2" opacity="0.12" />
      <path d="M0 55 Q50 25 100 55 Q150 85 200 55" fill="none" stroke={cfg.color} strokeWidth="1.5" opacity="0.08" />
      <circle cx="100" cy="45" r="8" fill={cfg.color} opacity="0.12" stroke={cfg.color} strokeWidth="1" strokeOpacity="0.25" />
    </svg>
  )
  if (discipline === 'Photography' || discipline === 'Visual Art') return (
    <svg width="100%" height={height} viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="90" fill={cfg.bg} />
      <circle cx="100" cy="45" r="50" fill="none" stroke={cfg.color} strokeWidth="10" opacity="0.08" />
      <circle cx="100" cy="45" r="28" fill="none" stroke={cfg.color} strokeWidth="5"  opacity="0.06" />
      <circle cx="100" cy="45" r="10" fill={cfg.color} opacity="0.1" />
    </svg>
  )
  if (discipline === 'Fashion') return (
    <svg width="100%" height={height} viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="90" fill={cfg.bg} />
      {[20,55,90,125,160].map((x, i) => (
        <rect key={x} x={x} y={5 + i * 4} width="22" height={80 - i * 4}
          fill={cfg.color} opacity={0.06 + i * 0.03} />
      ))}
    </svg>
  )
  if (discipline === 'Design') return (
    <svg width="100%" height={height} viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="90" fill={cfg.bg} />
      <rect x="0" y="42" width="200" height="1" fill={cfg.color} opacity="0.12" />
      <rect x="0" y="46" width="130" height="1" fill={cfg.color} opacity="0.08" />
      <text x="100" y="32" textAnchor="middle" fontFamily="IBM Plex Mono,monospace" fontWeight="900"
        fontSize="22" fill={cfg.color} opacity="0.1" letterSpacing="-1">BLKUZZ</text>
    </svg>
  )
  return (
    <svg width="100%" height={height} viewBox="0 0 200 90" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="90" fill={cfg.bg} />
      <line x1="0" y1="30" x2="200" y2="60" stroke={cfg.color} strokeWidth="1" opacity="0.12" />
      <line x1="0" y1="50" x2="200" y2="20" stroke={cfg.color} strokeWidth="1" opacity="0.08" />
      <rect x="60" y="25" width="80" height="40" fill="none" stroke={cfg.color} strokeWidth="0.5" opacity="0.15" />
    </svg>
  )
}

function FeaturedArt({ project }) {
  if (project.coverImage) return (
    <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover"
      style={{ objectPosition: project.coverImagePosition ?? '50% 50%' }} />
  )
  const cfg = discCfg(project.disciplines?.[0])
  return (
    <svg width="100%" height="140" viewBox="0 0 620 140" preserveAspectRatio="xMidYMid slice">
      <rect width="620" height="140" fill={cfg.bg} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle"
        fontFamily="Space Grotesk,sans-serif" fontWeight="900" fontSize="72"
        fill="#ffffff06" letterSpacing="-4">{project.title?.slice(0, 4).toUpperCase()}</text>
      <line x1="0" y1="70" x2="620" y2="70" stroke="#ffffff05" strokeWidth="1" />
      <CardArt discipline={project.disciplines?.[0]} height={140} />
    </svg>
  )
}


// ─── Create modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm]               = useState({ title: '', tagline: '', description: '', location: '', status: 'active' })
  const [chapInput, setChapInput]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [coverFile, setCoverFile]       = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [dragging, setDragging]         = useState(false)
  const [imgPos, setImgPos]             = useState({ x: 50, y: 50 })
  const [repoHover, setRepoHover]       = useState(false)
  const fileInputRef  = useRef(null)
  const imgDragging   = useRef(false)
  const imgDragAnchor = useRef({ mx: 0, my: 0, px: 50, py: 50 })
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const pickFile = file => {
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setImgPos({ x: 50, y: 50 })
  }

  useEffect(() => {
    const move = e => {
      if (!imgDragging.current) return
      const { mx, my, px, py } = imgDragAnchor.current
      setImgPos({
        x: Math.max(0, Math.min(100, px + (e.clientX - mx) / 2.5)),
        y: Math.max(0, Math.min(100, py + (e.clientY - my) / 2.5)),
      })
    }
    const up = () => { imgDragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup',   up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup',   up)
    }
  }, [])

  const [submitError, setSubmitError] = useState(null)

  const submit = async e => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    try {
      const chapters = chapInput.split(',').map(s => s.trim()).filter(Boolean)

      let coverImage = ''
      if (coverFile) {
        const fd = new FormData()
        fd.append('file', coverFile)
        fd.append('type', 'cover')
        const upRes = await apiFetch('/api/upload', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error ?? 'Upload failed')
        coverImage = upData.url ?? ''
      }

      const coverImagePosition = `${imgPos.x.toFixed(1)}% ${imgPos.y.toFixed(1)}%`
      const res  = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, chapters, coverImage, coverImagePosition }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create project')

      onCreated()
    } catch (err) {
      setSubmitError(err.message)
      setSubmitting(false)
    }
  }

  const inputCls = [
    'w-full font-mono text-[11px] tracking-[0.04em]',
    'px-3 py-2.5 focus:outline-none',
    'border-b border-[#1e1e1e] focus:border-[#FDC214]',
    'bg-transparent text-[#e8e8e8] placeholder-white/40',
    'transition-colors',
  ].join(' ')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg border-t border-l border-r border-[#1e1e1e] max-h-[92vh] overflow-y-auto flex flex-col"
        style={{ background: '#0a0a0a' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e] sticky top-0" style={{ background: '#0a0a0a' }}>
          <div className="flex-1 text-center">
            <p className="font-mono text-[8px] tracking-[0.25em] uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>New transmission</p>
            <p className="font-head text-[24px]" style={{ color: '#FDC214', letterSpacing: '2px' }}>Create Project</p>
          </div>
          <button onClick={onClose} className="flex items-center justify-center">
            <img src="/portal/icons/cross-y.png" alt="close" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col divide-y divide-[#111]">

          {/* Title */}
          <div className="px-5 pt-4 pb-3">
            <label className="font-mono text-[7px] tracking-[0.25em] uppercase block mb-2" style={{ color: '#e8e8e8' }}>
              Project Title *
            </label>
            <input name="title" value={form.title} onChange={handle} required
              placeholder="e.g. SOUL — FW26" className={inputCls} />
          </div>

          {/* Tagline */}
          <div className="px-5 pt-4 pb-3">
            <label className="font-mono text-[7px] tracking-[0.25em] uppercase block mb-2" style={{ color: '#e8e8e8' }}>
              Tagline
            </label>
            <input name="tagline" value={form.tagline} onChange={handle}
              placeholder="One line — shows on the project card" className={inputCls} />
          </div>

          {/* Description */}
          <div className="px-5 pt-4 pb-3">
            <label className="font-mono text-[7px] tracking-[0.25em] uppercase block mb-2" style={{ color: '#e8e8e8' }}>
              Description
            </label>
            <textarea name="description" value={form.description} onChange={handle} rows={3}
              placeholder="What is this project? Lives in the About tab."
              className={`${inputCls} resize-none`} />
          </div>

          {/* Location */}
          <div className="px-5 pt-4 pb-3">
            <label className="font-mono text-[7px] tracking-[0.25em] uppercase block mb-2" style={{ color: '#e8e8e8' }}>
              Location
            </label>
            <input name="location" value={form.location} onChange={handle}
              placeholder="e.g. London, My bedroom…" className={inputCls} />
          </div>

          {/* Milestones */}
          <div className="px-5 pt-4 pb-4">
            <label className="font-mono text-[7px] tracking-[0.25em] uppercase block mb-2" style={{ color: '#e8e8e8' }}>
              Milestones
            </label>
            <input value={chapInput} onChange={e => setChapInput(e.target.value)}
              placeholder="Idea, Update, Progress…" className={inputCls} />
            <p className="font-mono text-[7px] mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Comma-separated. Leave blank for defaults.
            </p>
          </div>

          {/* Cover image upload */}
          <div className="px-5 pt-4 pb-4">
            <label className="font-mono text-[7px] tracking-[0.25em] uppercase block mb-3" style={{ color: '#e8e8e8' }}>
              Cover Image
            </label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => pickFile(e.target.files?.[0])} />

            {coverPreview ? (
              <div className="relative overflow-hidden" style={{ height: 180 }}
                onMouseEnter={() => setRepoHover(true)}
                onMouseLeave={() => setRepoHover(false)}>
                <img
                  src={coverPreview} alt="cover preview" draggable={false}
                  onMouseDown={e => {
                    e.preventDefault()
                    imgDragging.current = true
                    imgDragAnchor.current = { mx: e.clientX, my: e.clientY, px: imgPos.x, py: imgPos.y }
                  }}
                  className="w-full h-full select-none"
                  style={{
                    objectFit: 'cover',
                    objectPosition: `${imgPos.x}% ${imgPos.y}%`,
                    cursor: imgDragging.current ? 'grabbing' : 'grab',
                  }}
                />
                {repoHover && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ background: 'rgba(0,0,0,0.35)' }}>
                    <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Drag to reposition
                    </span>
                  </div>
                )}
                <button type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(null) }}
                  className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 pointer-events-auto">
                  <img src="/portal/icons/cross-y.png" alt="remove" style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]) }}
                className="w-full border border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-colors"
                style={{ borderColor: dragging ? '#FDC214' : '#2a2a2a' }}>
                <p className="font-mono text-[8px] tracking-[0.15em] uppercase" style={{ color: dragging ? '#FDC214' : '#444' }}>
                  Drop image or click to browse
                </p>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="font-mono text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>JPG · PNG · WEBP</p>
                  <p className="font-mono text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Design at <span style={{ color: 'rgba(255,255,255,0.4)' }}>1200 × 400px</span> — displayed at:</p>
                  <p className="font-mono text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Card 90px · Featured 140px · Detail 200px tall</p>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="px-5 pt-4 pb-4">
            <label className="font-mono text-[7px] tracking-[0.25em] uppercase block mb-3" style={{ color: '#e8e8e8' }}>
              Status
            </label>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, status: f.status === 'active' ? 'completed' : 'active' }))}
              className="flex items-center gap-3">
              <div style={{
                width: 42, height: 24, borderRadius: 9999,
                background: form.status === 'completed' ? '#FDC214' : '#1e1e1e',
                border: '1px solid',
                borderColor: form.status === 'completed' ? '#FDC214' : '#333',
                position: 'relative', transition: 'background 0.2s, border-color 0.2s',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: form.status === 'completed' ? 21 : 3,
                  width: 16, height: 16, borderRadius: 9999,
                  background: form.status === 'completed' ? '#0a0a0a' : '#444',
                  transition: 'left 0.2s, background 0.2s',
                }} />
              </div>
              <span className="font-mono text-[8px] tracking-[0.12em] uppercase"
                style={{ color: form.status === 'completed' ? '#FDC214' : '#555' }}>
                {form.status === 'active' ? 'Active' : 'Completed'}
              </span>
            </button>
          </div>

          {/* Submit */}
          <div className="px-5 py-4">
            {submitError && (
              <p className="font-mono text-[8px] mb-3 text-center" style={{ color: '#ff4444' }}>
                {submitError}
              </p>
            )}
            <button type="submit" disabled={submitting || !form.title}
              className="w-full font-mono text-[9px] tracking-[0.25em] uppercase py-3.5 rounded-full transition-colors disabled:opacity-30"
              style={{ background: '#FDC214', color: '#0a0a0a' }}>
              {submitting ? 'Creating…' : 'Create Project →'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

// ─── Grid card ────────────────────────────────────────────────────────────────
function GridCard({ project, uid, onDelete }) {
  const cfg         = discCfg(project.disciplines?.[0])
  const isOwner     = project.creator?._id?.toString() === uid || project.creator?.toString() === uid
  const isFollowing = project.followers?.some(f => f === uid || f?._id === uid || f?.toString() === uid)
  const [following, setFollowing] = useState(isFollowing)
  const [count, setCount]         = useState(project.followerCount ?? 0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const router = useRouter()

  const toggleFollow = async e => {
    e.stopPropagation()
    if (isOwner) return
    const res  = await apiFetch(`/api/projects/${project.slug}/follow`, { method: 'POST' })
    const data = await res.json()
    setFollowing(data.following)
    setCount(data.count)
  }

  return (
    <div className="relative cursor-pointer group border border-[#141414]"
      style={{ background: '#0d0d0d' }}
      onClick={() => router.push(`/home/projects/${project.slug}`)}>
      <div className="overflow-hidden" style={{ height: 90 }}>
        {project.coverImage
          ? <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover"
              style={{ objectPosition: project.coverImagePosition ?? '50% 50%' }} />
          : <CardArt discipline={project.disciplines?.[0]} height={90} />}
      </div>
      <div className="p-2.5">
        <span className="font-mono text-[9px] tracking-[0.15em] uppercase block mb-1 px-1.5 py-0.5 rounded-full w-fit border"
          style={{
            color:       project.status === 'completed' ? '#FF0000' : '#008000',
            borderColor: project.status === 'completed' ? 'rgba(255,0,0,0.4)' : 'rgba(0,128,0,0.4)',
            background:  'transparent',
          }}>
          {project.status}
        </span>
        <p className="font-head text-[16px] leading-tight mb-0.5"
          style={{ color: '#FDC214', letterSpacing: '2px' }}>
          {project.title}
        </p>
        {project.tagline && (
          <p className="font-space text-[12px] mb-1 leading-tight" style={{ color: '#e8e8e8' }}>
            {project.tagline}
          </p>
        )}
        <div className="flex items-center gap-1.5 mb-0.5">
          {(project.creator?.avatar?.url || project.creator?.profileImage) && (
            <img src={project.creator.avatar?.url ?? project.creator.profileImage}
              alt={project.creator.username} className="w-6 h-6 rounded-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
          <span className="font-mono text-[9px]" style={{ color: '#FDC214' }}>@{project.creator?.username}</span>
        </div>
        {project.collaboratorsNeeded && project.collaboratorDisciplines?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {project.collaboratorDisciplines.map((d, i) => (
              <span key={i} className="font-head text-[8px] uppercase px-1.5 py-0.5 border rounded-full"
                style={{ borderColor: '#FDC214', color: '#0a0a0a', background: '#FDC214', letterSpacing: '1px' }}>{pluralise(d)}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2.5 mb-2">
          <span className="font-mono text-[9px] flex items-center gap-1" style={{ color: '#777' }}>
            <Users size={11} /> {count}
          </span>
        </div>
      </div>
      {isOwner && (
        <div className="absolute top-1.5 right-1.5 z-10" onClick={e => e.stopPropagation()}>
          {confirmDelete ? (
            <div className="flex items-center gap-1" style={{ background: '#0d0d0d', border: '1px solid #D2042D40', padding: '3px 6px' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 6, color: '#D2042D', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Delete?</span>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  const res = await apiFetch(`/api/projects/${project.slug}`, { method: 'DELETE' })
                  if (res.ok) onDelete?.(project._id)
                  else setDeleting(false)
                }}
                style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 6, color: '#D2042D', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {deleting ? '…' : 'Yes'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 6, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                No
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer', lineHeight: 0 }}>
              <img src="/portal/icons/trash-bin.png" alt="delete" style={{ width: 13, height: 13, filter: 'invert(21%) sepia(95%) saturate(7000%) hue-rotate(342deg) brightness(85%) contrast(115%)' }} />
            </button>
          )}
        </div>
      )}
      <div className="absolute inset-0 border opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{ borderColor: 'rgba(0,255,136,0.18)' }} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { data: session }       = useSession()
  const searchParams            = useSearchParams()
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]         = useState(() => searchParams.get('tab') || 'My Projects')
  const [disciplines, setDisciplines] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [modal, setModal]           = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const uid = session?.user?.id

  const [loadError, setLoadError] = useState(null)

  const load = () => {
    setLoading(true)
    setLoadError(null)
    const params = filter === 'Following' ? '?following=1'
      : filter === 'My Projects' ? '?mine=1'
      : filter === 'Explore' ? '?explore=1'
      : filter !== 'All' ? `?discipline=${encodeURIComponent(filter)}`
      : ''
    apiFetch(`/api/projects${params}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data)
        } else {
          setLoadError(data?.error ?? 'Failed to load projects')
          setProjects([])
        }
        setLoading(false)
      })
      .catch(err => {
        setLoadError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [filter])

  useEffect(() => {
    apiFetch('/api/projects/disciplines').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setDisciplines(data.sort())
    })
  }, [])

  const filtered = searchQuery.trim()
    ? projects.filter(p => {
        const q = searchQuery.toLowerCase()
        return (
          p.title?.toLowerCase().includes(q) ||
          p.creator?.username?.toLowerCase().includes(q) ||
          p.creator?.tags?.some(t => t.toLowerCase().includes(q)) ||
          p.disciplines?.some(d => d.toLowerCase().includes(q)) ||
          p.collaborators?.some(c =>
            c.username?.toLowerCase().includes(q) ||
            c.tags?.some(t => t.toLowerCase().includes(q))
          )
        )
      })
    : projects

  const featured = filtered[0] ?? null
  const grid     = filtered.slice(1)
  const featCfg  = featured ? discCfg(featured.disciplines?.[0]) : null

  const isFollowingFeat = featured?.followers?.some(f => f === uid || f?._id === uid || f?.toString() === uid)
  const [featFollowing, setFeatFollowing]       = useState(false)
  const [featCount, setFeatCount]               = useState(0)
  const [featConfirmDelete, setFeatConfirmDelete] = useState(false)
  const [featDeleting, setFeatDeleting]           = useState(false)

  useEffect(() => {
    setFeatFollowing(isFollowingFeat)
    setFeatCount(featured?.followerCount ?? 0)
  }, [featured])

  const toggleFeatFollow = async () => {
    const res  = await apiFetch(`/api/projects/${featured.slug}/follow`, { method: 'POST' })
    const data = await res.json()
    setFeatFollowing(data.following)
    setFeatCount(data.count)
  }

  const router = useRouter()

  // Keep the active tab in the URL so browser/in-app back navigation
  // restores it instead of always landing back on the default tab.
  const changeFilter = f => {
    setFilter(f)
    const qs = f === 'My Projects' ? '' : `?tab=${encodeURIComponent(f)}`
    router.replace(`/home/projects${qs}`, { scroll: false })
  }

  return (
    <div className="-m-8 flex flex-col min-h-screen font-space" style={{ background: '#0a0a0a', color: '#e8e8e8' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a]">
        <span className="font-head text-[17px]" style={{ color: '#FDC214', letterSpacing: '2px' }}>BLKUZZ</span>
        <div className="flex items-center gap-4">
          <Search size={19} className="cursor-pointer" style={{ color: '#FDC214' }} onClick={() => { setSearchOpen(v => !v); setSearchQuery('') }} />
          <button onClick={() => setModal(true)}>
            <Plus size={19} style={{ color: '#FDC214' }} />
          </button>
          <User size={19} className="cursor-pointer" style={{ color: '#FDC214' }} onClick={() => router.push('/home/profile/edit')} />
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="px-4 py-2 border-b border-[#1a1a1a]" style={{ background: '#0a0a0a' }}>
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by project name or member…"
            className="w-full bg-transparent font-mono text-[12px] tracking-wider outline-none search-input-dark"
            style={{ color: '#e8e8e8', caretColor: '#e8e8e8' }}
          />
        </div>
      )}

      {/* Section header */}
      <div className="flex items-end justify-between px-4 py-3.5 border-b border-[#141414]">
        <div>
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Transmissions in progress
          </p>
          <h1 className="font-head text-[25px] leading-none" style={{ letterSpacing: '2px', color: '#FDC214' }}>
            Projects
          </h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {projects.filter(p => p.status !== 'completed').length} active
          </p>
        </div>
      </div>

      {/* Static filters */}
      <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto border-b border-[#141414]"
        style={{ scrollbarWidth: 'none' }}>
        {STATIC_FILTERS.map(f => (
          <button key={f} onClick={() => changeFilter(f)}
            className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border rounded-full whitespace-nowrap transition-colors"
            style={{
              borderColor: '#FDC214',
              color:       filter === f ? '#0a0a0a' : '#FDC214',
              background:  filter === f ? '#FDC214' : 'transparent',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Discipline tag filter — collapsible "+" dropdown */}
      {disciplines.length > 0 && (
        <div className="border-b border-[#141414]">
          <button onClick={() => setFiltersOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em]"
            style={{ background: 'transparent', border: 'none', color: !STATIC_FILTERS.includes(filter) ? '#FDC214' : 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            <span>Filters{!STATIC_FILTERS.includes(filter) ? ` · ${filter}` : ''}</span>
            <span style={{ color: '#FDC214', fontSize: 19 }}>{filtersOpen ? '−' : '+'}</span>
          </button>
          {filtersOpen && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
              {disciplines.map(d => (
                <button key={d} onClick={() => changeFilter(filter === d ? 'My Projects' : d)}
                  className="font-mono text-[8px] uppercase px-2.5 py-1 border rounded-full whitespace-nowrap transition-colors"
                  style={{
                    borderColor: filter === d ? '#FDC214' : '#777',
                    color:       filter === d ? '#0a0a0a' : '#777',
                    background:  filter === d ? '#FDC214' : 'transparent',
                    letterSpacing: '1px',
                  }}>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>LOADING...</span>
        </div>
      ) : loadError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: '#ff4444' }}>Error loading projects</span>
          <span className="font-mono text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{loadError}</span>
        </div>
      ) : projects.length === 0 ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>NO PROJECTS YET</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* Featured project */}
          {featured && (
            <div className="mx-3 mt-3 border border-[#1a1a1a] cursor-pointer" style={{ background: '#0d0d0d' }}
              onClick={() => router.push(`/home/projects/${featured.slug}`)}>
              <div className="relative overflow-hidden" style={{ height: 140 }}>
                <FeaturedArt project={featured} />
                <span className="absolute top-2.5 left-2.5 font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-1 rounded-full"
                  style={{
                    background:  'transparent',
                    color:       featured.status === 'completed' ? '#FF0000' : '#008000',
                    border:      featured.status === 'completed' ? '1px solid rgba(255,0,0,0.4)' : '1px solid rgba(0,255,136,0.2)',
                  }}>
                  {featured.status}
                </span>
                {(featured.creator?._id?.toString() === uid || featured.creator?.toString() === uid) && (
                  <div className="absolute top-2.5 right-2.5" onClick={e => e.stopPropagation()}>
                    {featConfirmDelete ? (
                      <div className="flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #D2042D40', padding: '3px 8px', borderRadius: 9999 }}>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#FDC214', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Delete?</span>
                        <button disabled={featDeleting} onClick={async () => {
                          setFeatDeleting(true)
                          const res = await apiFetch(`/api/projects/${featured.slug}`, { method: 'DELETE' })
                          if (res.ok) setProjects(prev => prev.filter(p => p._id !== featured._id))
                          else setFeatDeleting(false)
                        }} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#D2042D', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {featDeleting ? '…' : 'Yes'}
                        </button>
                        <button onClick={() => setFeatConfirmDelete(false)} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>No</button>
                      </div>
                    ) : (
                      <button onClick={() => setFeatConfirmDelete(true)} style={{ background: 'transparent', border: 'none', padding: '4px 5px', cursor: 'pointer', lineHeight: 0 }}>
                        <img src="/portal/icons/trash-bin.png" alt="delete" style={{ width: 13, height: 13, filter: 'invert(21%) sepia(95%) saturate(7000%) hue-rotate(342deg) brightness(85%) contrast(115%)' }} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  {(featured.creator?.avatar?.url || featured.creator?.profileImage) && (
                    <img src={featured.creator.avatar?.url ?? featured.creator.profileImage}
                      alt={featured.creator.username} className="w-6 h-6 rounded-full object-cover"
                      onError={e => { e.currentTarget.style.display = 'none' }} />
                  )}
                  <span className="font-body font-normal text-[10px]" style={{ color: '#FDC214' }}>
                    @{featured.creator?.username}
                  </span>
                  {featured.location && (
                    <span className="font-body font-normal text-[10px] uppercase ml-auto" style={{ color: '#FDC214' }}>
                      {featured.location}
                    </span>
                  )}
                </div>

                {featured.collaboratorsNeeded && featured.collaboratorDisciplines?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {featured.collaboratorDisciplines.map((d, i) => (
                      <span key={i} className="font-head text-[8px] uppercase px-1.5 py-0.5 border rounded-full"
                        style={{ borderColor: '#FDC214', color: '#0a0a0a', background: '#FDC214', letterSpacing: '1px' }}>{pluralise(d)}</span>
                    ))}
                  </div>
                )}

                <h2 className="font-head text-[19px] leading-tight mb-1" style={{ letterSpacing: '2px', color: '#FDC214' }}>
                  {featured.title}
                </h2>
                {featured.tagline && (
                  <p className="font-body font-normal text-[13px] leading-relaxed mb-2 uppercase" style={{ color: '#e8e8e8' }}>
                    {featured.tagline}
                  </p>
                )}

                {/* Progress bar */}


                <div className="flex items-center gap-3 pt-2.5 border-t border-[#141414]">
                  <span className="font-mono text-[8px] flex items-center gap-1" style={{ color: '#e8e8e8' }}>
                    <Users size={13} /> {featCount}
                  </span>
                  <button onClick={() => router.push(`/home/projects/${featured.slug}`)}
                    className="font-mono text-[9px] tracking-[0.1em]" style={{ color: '#e8e8e8' }}>
                    CLICK TO VIEW
                  </button>
                  {featured.creator?._id?.toString() !== uid && featured.creator?.toString() !== uid && (
                    <button onClick={e => { e.stopPropagation(); toggleFeatFollow() }}
                      className="ml-auto font-mono text-[9px] tracking-[0.15em] uppercase px-3.5 py-1.5 border transition-colors"
                      style={{
                        borderColor: featFollowing ? '#008000' : '#FDC214',
                        color:       featFollowing ? '#008000' : '#FDC214',
                        background:  'transparent',
                      }}>
                      {featFollowing ? '✓ Following' : '+ Follow project'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          {grid.length > 0 && (
            <p className="px-4 pt-3 pb-1.5 font-mono text-[10px] tracking-[0.25em] uppercase border-t border-[#141414] mt-3"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              More projects
            </p>
          )}
          {grid.length > 0 && (
            <div className="grid grid-cols-2 gap-[1px] mx-3 mb-3 border border-[#141414]"
              style={{ background: '#141414' }}>
              {grid.map(p => (
                <GridCard key={p._id} project={p} uid={uid} onDelete={id => setProjects(prev => prev.filter(p => p._id !== id))} />
              ))}
            </div>
          )}
        </div>
      )}

      {modal && <CreateModal onClose={() => setModal(false)} onCreated={() => { setModal(false); load() }} />}
    </div>
  )
}
