'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { apiFetch } from '@/lib/api'
import { Plus, AlertTriangle } from 'lucide-react'

const TYPES = ['Looking for', 'Open to work', 'Events']

const isVideo = url => /\.(mp4|mov|webm|ogg|avi|m4v|mkv|3gp)(\?|$)/i.test(url)

const CHANNELS = {
  'Looking for':   { code: 'BLK.01', color: '#e8ff00' },
  'Open to work':  { code: 'BLK.02', color: '#00ff88' },
  'Events':        { code: 'BLK.04', color: '#00aaff' },
}
const URGENT_CHANNEL = { code: 'BLK.06', color: '#D2042D' }

const FILTERS = ['All', 'Looking for', 'Open to work', 'Events', 'Urgent', 'My posts']

function shortTimeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  if (s < 2629800) return `${Math.floor(s / 604800)}w`
  if (s < 31557600) return `${Math.floor(s / 2629800)}mo`
  return `${Math.floor(s / 31557600)}y`
}

function barHeights(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return [0, 1, 2, 3].map(i => 4 + ((h >> (i * 4)) % 7))
}

export default function BulletinPage() {
  const router                  = useRouter()
  const { data: session }       = useSession()
  const [posts, setPosts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [filter, setFilter]     = useState('All')
  const [form, setForm]         = useState({ projectRef: '', projectName: '', content: '', tags: [], category: 'Looking for', urgent: false, completed: false, date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [time, setTime]         = useState('')
  const [availableTags, setAvailableTags] = useState([])
  const [mediaUrls, setMediaUrls]   = useState([])
  const [uploading, setUploading]   = useState(false)
  const [myProjects, setMyProjects] = useState([])
  const [lightbox, setLightbox]     = useState(null)
  const [sentRequests, setSentRequests]         = useState(new Set())
  const [declinedRequests, setDeclinedRequests] = useState(new Set())
  const [editingPost, setEditingPost]   = useState(null)
  const fileInputRef                    = useRef(null)

  const load = (currentFilter) => {
    const f = currentFilter ?? filter
    const url = f === 'My posts' ? '/api/collaborate?mine=1' : '/api/collaborate'
    apiFetch(url).then(r => r.json()).then(data => {
      setPosts(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
    localStorage.setItem('collaborate:lastSeen', new Date().toISOString())
  }, [])

  useEffect(() => { load(filter) }, [filter])

  useEffect(() => {
    if (loading) return
    const postId = new URLSearchParams(window.location.search).get('post')
    if (!postId) return
    const el = document.querySelector(`[data-post-id="${postId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [loading])

  useEffect(() => {
    apiFetch('/api/tags').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAvailableTags(data)
    })
  }, [])

  useEffect(() => {
    apiFetch('/api/notifications').then(r => r.json()).then(data => {
      const ids = new Set(
        (data.notifications ?? [])
          .filter(n => n.type === 'collab_request' && n.status === 'declined' && n.bulletinPost)
          .map(n => n.bulletinPost.toString())
      )
      setDeclinedRequests(ids)
    })
  }, [])

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const openModal = () => {
    setModal(true)
    apiFetch('/api/projects?mine=1').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setMyProjects(data)
    })
  }

  const closeModal = () => {
    setModal(false)
    setEditingPost(null)
    setForm({ projectRef: '', projectName: '', content: '', tags: [], category: 'Looking for', urgent: false, completed: false, date: '' })
    setMediaUrls([])
  }

  const openEditModal = post => {
    setEditingPost(post)
    setForm({
      projectRef:  post.projectRef?._id || '',
      projectName: post.projectName || '',
      content:     post.content || '',
      tags:        post.tags || [],
      category:    post.category || 'Looking for',
      urgent:      post.urgent || false,
      completed:   post.completed || false,
      date:        post.date ? new Date(post.date).toISOString().slice(0, 10) : '',
    })
    setMediaUrls(post.media || [])
    openModal()
  }

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

  const handle = e => {
    const { name, type, checked, value } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const submit = async e => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        role:        form.projectName || form.category,
        projectName: form.projectName,
        content:     form.content,
        tags:        form.tags,
        projectRef:  form.projectRef || null,
        media:       mediaUrls,
        category:    form.category,
        urgent:      form.urgent,
        completed:   form.completed,
        date:        form.date || null,
      }
      const url    = editingPost ? `/api/collaborate/${editingPost._id}` : '/api/collaborate'
      const method = editingPost ? 'PATCH' : 'POST'
      const res    = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[bulletin submit]', res.status, err)
      }
      closeModal()
      load(filter)
    } catch (err) {
      console.error('[bulletin submit] threw:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const stats = useMemo(() => {
    const base = posts.filter(p => !p.completed)
    return {
      open:   base.length,
      urgent: base.filter(p => p.urgent).length,
      today:  base.filter(p => Date.now() - new Date(p.createdAt) < 86400000).length,
    }
  }, [posts])

  const filtered = useMemo(() => {
    if (filter === 'All' || filter === 'My posts') return posts
    if (filter === 'Urgent') return posts.filter(p => p.urgent)
    return posts.filter(p => (p.category || 'Looking for') === filter)
  }, [posts, filter, session])

  return (
    <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#e8e8e8', overflow: 'hidden' }}>

      {/* Live bar */}
      <div className="flex items-center justify-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #1f1f1f', background: '#0a0a0a' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#008000] animate-pulse2 inline-block" />
        <span className="font-mono text-[10px] tracking-[0.15em] text-[#008000]">LIVE</span>
        <span className="font-mono text-[10px] text-[#444] tracking-[0.1em]">{time}</span>
      </div>

      {/* Frequency header */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #141414' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[8px] tracking-[0.25em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Open frequency — collab requests &amp; call-outs
            </p>
            <h1 className="font-head text-white text-2xl mb-2" style={{ letterSpacing: '2px' }}>Collaborate</h1>
            <div className="flex gap-4 font-mono text-[8px] tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span><span style={{ color: '#FDC214' }}>{stats.open}</span> open listings</span>
              <span><span style={{ color: '#D2042D' }}>{stats.urgent}</span> urgent</span>
              <span><span style={{ color: '#008000' }}>{stats.today}</span> active today</span>
            </div>
          </div>
          <button onClick={openModal}
            className="flex items-center gap-1.5 bg-gold text-black font-head tracking-widest uppercase text-[10px] px-3.5 py-2 rounded-full hover:bg-yellow-300 transition-colors shrink-0">
            <Plus size={12} /> Post call-out
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 px-6 py-2.5 flex-shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #141414', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="font-mono text-[8px] tracking-[0.1em] uppercase px-2.5 py-1.5 whitespace-nowrap transition-colors"
            style={{
              border: '1px solid', borderRadius: 9999,
              borderColor: filter === f ? '#FDC214' : '#1e1e1e',
              color: filter === f ? '#FDC214' : '#444',
              background: 'transparent',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Column labels */}
      <div className="flex px-6 py-2 font-mono text-[7px] tracking-[0.15em] uppercase flex-shrink-0" style={{ borderBottom: '1px solid #141414', color: 'rgba(255,255,255,0.4)' }}>
        <div style={{ width: 64 }}>Channel</div>
        <div className="flex-1">Transmission</div>
        <div style={{ width: 44 }} className="hidden lg:block text-right">Logged</div>
      </div>

      {/* Scrollable listings */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>NO CALLOUTS IN THIS CHANNEL YET.</div>
        ) : (
          <div className="flex flex-col">
            {filtered.map(post => {
              const ch = post.urgent ? URGENT_CHANNEL : (CHANNELS[post.category] || CHANNELS['Looking for'])
              const bars = barHeights(post._id)
              const isHighlighted = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('post') === post._id
              return (
                <div key={post._id} data-post-id={post._id} className="flex relative group" style={{ borderBottom: '1px solid #111', background: isHighlighted ? 'rgba(253,194,20,0.04)' : 'transparent', transition: 'background 0.3s' }}>
                  <div className="absolute left-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: 2, background: ch.color }} />

                  {/* Channel col */}
                  <div className="flex flex-col items-center justify-center gap-1" style={{ width: 64, flexShrink: 0, padding: '10px 6px', borderRight: '1px solid #141414' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: ch.color }} />
                    <div className="font-mono text-[8px] tracking-wide font-bold" style={{ color: ch.color }}>{ch.code}</div>
                    <div className="flex gap-[1px] items-end" style={{ height: 10 }}>
                      {bars.map((h, i) => (
                        <div key={i} style={{ width: 2, height: h, background: `${ch.color}${60 + i * 10}` }} />
                      ))}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 px-3.5 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      {(() => { const av = post.author?.avatar?.url || post.author?.profileImage || null; return av ? <img src={av} alt="" onError={e => { e.currentTarget.style.display = 'none' }} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : null })()}
                      <span className="font-mono text-[8px]" style={{ color: '#fff' }}>@{post.author?.username}</span>
                      {post.projectRef?.title && (
                        <button onClick={e => { e.stopPropagation(); router.push(`/home/projects/${post.projectRef.slug}`) }}
                          className="font-mono text-[7px] tracking-[0.08em] uppercase px-2 py-0.5 cursor-pointer"
                          style={{ border: '1px solid rgba(253,194,20,0.4)', color: '#FDC214', borderRadius: 9999 }}>
                          {post.projectRef.title}
                        </button>
                      )}
                      {post.category && (
                        <span className="font-mono text-[7px] tracking-[0.08em] uppercase px-1.5 py-0.5"
                          style={{ color: ch.color, border: `1px solid ${ch.color}60` }}>
                          {post.category}
                        </span>
                      )}
                      {post.urgent && (
                        <span className="font-mono text-[7px] tracking-[0.1em] uppercase px-1.5 py-0.5" style={{ color: '#D2042D', border: '1px solid #D2042D40' }}>⚠ Urgent</span>
                      )}
                      {post.completed && (
                        <span className="font-mono text-[7px] tracking-[0.1em] uppercase px-1.5 py-0.5" style={{ color: '#00C853', border: '1px solid rgba(0,200,83,0.4)', borderRadius: 9999 }}>Complete</span>
                      )}
                      {post.author?._id === session?.user?.id && (
                        <div className="ml-auto flex items-center gap-2">
                          <button onClick={() => openEditModal(post)}
                            className="font-mono text-[7px] tracking-[0.1em] uppercase"
                            style={{ color: 'rgba(255,255,255,0.8)' }}>edit</button>
                          <button onClick={async () => {
                            await apiFetch(`/api/collaborate/${post._id}`, { method: 'DELETE' })
                            load()
                          }} title="Delete">
                            <img src="/portal/icons/trash-bin.png" alt="delete" style={{ width: 12, height: 12, filter: 'invert(21%) sepia(95%) saturate(7000%) hue-rotate(342deg) brightness(85%) contrast(115%)' }} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="font-head text-[13px] mb-1 leading-tight" style={{ color: '#FDC214', letterSpacing: '2px' }}>
                      {post.projectName || post.category || 'Untitled'}
                    </p>
                    <p className="text-[10px] mb-2 leading-relaxed" style={{ color: '#fff' }}>{post.content}</p>
                    {post.date && (
                      <p className="font-mono text-[7px] tracking-[0.1em] uppercase mb-2" style={{ color: '#FDC214' }}>
                        Date: {new Date(post.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {post.tags.map(t => (
                          <span key={t} className="font-mono text-[7px] tracking-[0.06em] uppercase px-1.5 py-0.5" style={{ border: '1px solid #FDC214', color: '#FDC214', borderRadius: 9999 }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {post.media?.length > 0 && (
                      <div className={`grid gap-1 mb-2 grid-cols-1 ${post.media.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                        {post.media.map((url, i) => (
                          isVideo(url)
                            ? <video key={i} src={url} controls onClick={() => setLightbox(url)} className="w-full rounded cursor-pointer h-40 lg:h-[200px]" style={{ objectFit: 'cover', display: 'block', border: '1px solid #1a1a1a' }} />
                            : <img key={i} src={url} alt="" onClick={() => setLightbox(url)} className="w-full rounded cursor-pointer h-40 lg:h-[200px]" style={{ objectFit: 'cover', display: 'block', border: '1px solid #1a1a1a' }} />
                        ))}
                      </div>
                    )}
                    {post.author?._id && post.author._id !== session?.user?.id && (() => {
                      const sent     = sentRequests.has(post._id)
                      const declined = declinedRequests.has(post._id)
                      return (
                        <button
                          disabled={sent || declined}
                          onClick={async () => {
                            const title = post.projectName || post.content?.slice(0, 60) + (post.content?.length > 60 ? '…' : '')
                            const res = await apiFetch('/api/collab', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ to: post.author._id, context: title, source: 'bulletin', bulletinPostId: post._id }),
                            })
                            if (res.ok) setSentRequests(prev => new Set([...prev, post._id]))
                          }}
                          className="font-mono text-[10px] tracking-[0.1em] uppercase px-4 py-2 transition-colors"
                          style={{
                            border:       declined ? '1px solid rgba(210,4,45,0.3)' : `1px solid ${sent ? 'rgba(0,200,0,0.4)' : `${ch.color}40`}`,
                            color:        declined ? '#D2042D80' : sent ? '#008000' : ch.color,
                            background:   'transparent',
                            borderRadius: 9999,
                            cursor:       'default',
                            opacity:      sent || declined ? 0.7 : 1,
                          }}>
                          {declined ? 'Declined' : sent ? 'Requested ✓' : 'Collab'}
                        </button>
                      )
                    })()}
                  </div>

                  {/* Time col */}
                  <div className="hidden lg:block font-mono text-[7px] shrink-0" style={{ width: 44, color: 'rgba(255,255,255,0.4)', padding: '10px 12px 10px 0', textAlign: 'right' }}>
                    {shortTimeAgo(post.createdAt)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setLightbox(null)}>
          {isVideo(lightbox)
            ? <video src={lightbox} controls autoPlay className="max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()} />
            : <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
          }
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4"><img src="/portal/icons/cross-y.png" alt="close" style={{ width: 18, height: 18, opacity: 0.6 }} /></button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="border rounded-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]" style={{ borderColor: '#FDC214', background: 'transparent', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="relative flex items-center justify-center mb-6">
              <h2 className="font-head text-white text-lg tracking-widest uppercase">{editingPost ? 'Edit Callout' : 'Post Callout'}</h2>
              <button onClick={closeModal} className="absolute right-0">
                <img src="/portal/icons/cross-y.png" alt="close" style={{ width: 18, height: 18, opacity: 0.6 }} />
              </button>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex gap-2">
                {TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, category: t }))}
                    className="flex-1 font-mono text-[9px] tracking-[0.08em] uppercase px-2 py-2 transition-colors"
                    style={{
                      border: '1px solid', borderRadius: 9999,
                      borderColor: form.category === t ? '#FDC214' : 'rgba(255,255,255,0.15)',
                      color: form.category === t ? '#FDC214' : 'rgba(255,255,255,0.4)',
                      background: 'transparent',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
              <select name="projectRef" value={form.projectRef} onChange={e => setForm(f => ({ ...f, projectRef: e.target.value }))}
                className="w-full bg-transparent rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
                style={{ border: '1px solid #FDC214' }}>
                <option value="" style={{ background: '#0D0D0D' }}>Link to a project (optional)</option>
                {myProjects.map(p => (
                  <option key={p._id} value={p._id} style={{ background: '#0D0D0D' }}>{p.title}</option>
                ))}
              </select>
              {form.projectRef && (() => {
                const linked = myProjects.find(p => p._id === form.projectRef)
                return linked ? (
                  <div className="flex items-center gap-1.5" style={{ marginTop: -8 }}>
                    <span className="font-mono text-[8px] tracking-[0.08em] uppercase px-2.5 py-1 flex items-center gap-1.5"
                      style={{ border: '1px solid #FDC214', color: '#FDC214', borderRadius: 9999 }}>
                      {linked.title}
                      <button type="button" onClick={() => setForm(f => ({ ...f, projectRef: '' }))}
                        className="leading-none" style={{ color: '#FDC214', fontSize: 10 }}>×</button>
                    </span>
                  </div>
                ) : null
              })()}
              <input name="projectName" value={form.projectName} onChange={handle} placeholder="Project name (optional)"
                className="w-full bg-transparent rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none placeholder-white/40"
                style={{ border: '1px solid #FDC214' }} />
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Date (optional)</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handle}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                  style={{
                    background: 'transparent',
                    border: '1px solid #FDC214',
                    color: form.date ? '#fff' : 'rgba(255,255,255,0.4)',
                    colorScheme: 'dark',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                />
              </div>
              <textarea name="content" value={form.content} onChange={handle} required rows={3} placeholder="Describe what you need…"
                className="w-full bg-transparent rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none resize-none placeholder-white/40"
                style={{ border: '1px solid #FDC214' }} />
              <p className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Looking for</p>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map(tag => {
                  const active = form.tags.includes(tag)
                  return (
                    <button key={tag} type="button"
                      onClick={() => setForm(f => ({ ...f, tags: active ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))}
                      className="font-mono text-[8px] tracking-[0.08em] uppercase px-2.5 py-1 transition-colors"
                      style={{
                        border: '1px solid', borderRadius: 9999,
                        borderColor: active ? '#FDC214' : 'rgba(255,255,255,0.15)',
                        color: active ? '#FDC214' : 'rgba(255,255,255,0.35)',
                        background: 'transparent',
                      }}>
                      {tag}
                    </button>
                  )
                })}
              </div>
              {/* Media upload */}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative">
                      {isVideo(url)
                        ? <video src={url} className="w-16 h-16 object-cover" />
                        : <img src={url} alt="" className="w-16 h-16 object-cover" />
                      }
                      <button type="button" onClick={() => setMediaUrls(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-black font-bold text-[9px]"
                        style={{ background: '#FDC214' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="font-mono text-[8px] tracking-[0.12em] uppercase px-3 py-1.5 transition-colors self-start"
                style={{ border: '1px solid', borderColor: uploading ? '#00C853' : '#FDC214', color: uploading ? '#00C853' : '#FDC214' }}>
                {uploading ? 'Uploading…' : '+ Add media'}
              </button>

              <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setForm(f => ({ ...f, urgent: !f.urgent }))}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${form.urgent ? '#D2042D' : '#FDC214'}`,
                  background: form.urgent ? '#D2042D' : 'transparent',
                  boxShadow: form.urgent ? '0 0 8px 2px rgba(210,4,45,0.6)' : 'none',
                  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                }} />
                <AlertTriangle size={12} style={{ color: form.urgent ? '#D2042D' : 'rgba(255,255,255,0.4)' }} />
                <span className="text-xs" style={{ color: form.urgent ? '#D2042D' : 'rgba(255,255,255,0.4)' }}>Mark as urgent</span>
              </div>
              {editingPost && (
                <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setForm(f => ({ ...f, completed: !f.completed }))}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    border: `1px solid ${form.completed ? '#00C853' : 'rgba(255,255,255,0.3)'}`,
                    background: form.completed ? '#00C853' : 'transparent',
                    boxShadow: form.completed ? '0 0 8px 2px rgba(0,200,83,0.5)' : 'none',
                    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                  }} />
                  <span className="text-xs" style={{ color: form.completed ? '#00C853' : 'rgba(255,255,255,0.4)' }}>Mark as complete — removes callout from the feed</span>
                </div>
              )}
              <button type="submit" disabled={submitting}
                className="bg-gold text-black font-head tracking-widest uppercase text-sm px-8 py-2.5 rounded-full hover:bg-yellow-300 transition-colors disabled:opacity-50 self-center">
                {submitting ? 'Saving…' : (editingPost ? 'Save' : 'Post')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
