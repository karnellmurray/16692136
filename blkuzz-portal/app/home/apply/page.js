'use client'
import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'

const GOLD  = '#FDC214'
const MONO  = 'IBM Plex Mono, monospace'
const SERIF = 'var(--font-cormorant), Cormorant Garamond, Georgia, serif'
const SANS  = 'Space Grotesk, sans-serif'

function MemberAvatar({ member, size = 22 }) {
  const url = member?.avatar || null
  const [imgOk, setImgOk] = useState(null)
  useEffect(() => { setImgOk(url ? null : false) }, [url])
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: size * 0.28, color: `${GOLD}80`, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
      {imgOk === false && member?.username?.slice(0, 2).toUpperCase()}
      {url && <img src={url} alt="" onLoad={() => setImgOk(true)} onError={() => setImgOk(false)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: imgOk === true ? 1 : 0 }} />}
    </div>
  )
}

function MembersSelect({ selected, onChange, allMembers }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const inputRef          = useRef(null)

  const filtered = allMembers.filter(m =>
    !selected.find(s => s.id === m.id) &&
    (!query || m.username?.toLowerCase().includes(query.toLowerCase()) || m.name?.toLowerCase().includes(query.toLowerCase()))
  )

  const add = m => {
    onChange([...selected, m])
    setQuery('')
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const remove = id => onChange(selected.filter(s => s.id !== id))

  return (
    <div style={{ position: 'relative' }}>
      {/* Backdrop — z48, closes dropdown on outside click */}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onMouseDown={() => setOpen(false)} />}
      {/* Pills + Input — z49, above backdrop so they stay interactive */}
      <div style={{ position: 'relative', zIndex: 49 }}>
        {selected.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {selected.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0d0d0d', border: `1px solid ${GOLD}40`, padding: '3px 8px 3px 10px', borderRadius: 9999, fontFamily: MONO, fontSize: 8, color: GOLD, letterSpacing: '0.08em' }}>
                @{m.username}
                <button type="button" onClick={() => remove(m.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, marginLeft: 2, display: 'flex', alignItems: 'center' }}>
                  <img src="/portal/icons/cross-y.png" alt="remove" style={{ width: 8, height: 8, filter: 'brightness(0) saturate(100%) invert(85%) sepia(50%) saturate(700%) hue-rotate(355deg) brightness(103%)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? 'Search members...' : 'Add another member...'}
          className="placeholder-white"
          style={{ width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e', borderBottom: '1px solid #333', color: '#e8e8e8', fontFamily: SANS, fontSize: 12, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      {/* Dropdown — z50, above everything */}
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d0d0d', border: '1px solid #1e1e1e', borderTop: 'none', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
          {filtered.map(m => (
            <div key={m._id} onMouseDown={e => { e.preventDefault(); add(m) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #111' }}>
              <MemberAvatar member={m} size={22} />
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: '#e8e8e8', letterSpacing: '0.05em' }}>@{m.username}</div>
                {m.discipline && <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>{m.discipline}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MediaUpload({ files, onChange }) {
  const inputRef                    = useRef(null)
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState('')

  const upload = async e => {
    const selected = Array.from(e.target.files)
    if (!selected.length) return
    setUploading(true)
    setError('')
    try {
      const results = await Promise.all(selected.map(async file => {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('type', 'post')
        const res  = await apiFetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        return { name: file.name, url: data.url, type: file.type }
      }))
      onChange([...files, ...results])
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const remove = idx => onChange(files.filter((_, i) => i !== idx))

  return (
    <div>
      <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={upload} style={{ display: 'none' }} />
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{ border: `1px dashed ${GOLD}`, padding: '14px 16px', cursor: uploading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: uploading ? 0.6 : 1 }}
      >
        <span style={{ fontFamily: MONO, fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>+</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
          {uploading ? 'Uploading...' : 'Upload any media to support your pitch'}
        </span>
      </div>
      {error && <div style={{ fontFamily: MONO, fontSize: 7, color: '#D2042D', marginTop: 4 }}>{error}</div>}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d0d0d', border: '1px solid #1e1e1e', padding: '7px 10px' }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: GOLD, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button type="button" onClick={() => remove(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, flexShrink: 0 }}>
                <img src="/portal/icons/cross-y.png" alt="remove" style={{ width: 8, height: 8, filter: 'brightness(0) saturate(100%) invert(85%) sepia(50%) saturate(700%) hue-rotate(355deg) brightness(103%)' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectSelect({ value, onChange, projects }) {
  const [open, setOpen]     = useState(false)
  const [hovered, setHovered] = useState(null)
  const selected = projects.find(p => p._id === value) || null

  return (
    <div style={{ position: 'relative' }}>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onMouseDown={() => setOpen(false)} />}
      <div style={{ position: 'relative', zIndex: 49 }}>
        <div onClick={() => setOpen(o => !o)}
          style={{ width: '100%', background: '#000', border: '1px solid #1e1e1e', color: selected ? '#e8e8e8' : '#444', fontFamily: MONO, fontSize: 11, padding: '10px 12px', cursor: 'pointer', boxSizing: 'border-box', userSelect: 'none' }}>
          {selected ? selected.title : 'Select a project'}
        </div>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#000', border: '1px solid #1e1e1e', borderTop: 'none', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
          {projects.map(p => (
            <div key={p._id}
              onMouseEnter={() => setHovered(p._id)}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={() => { onChange(p._id); setOpen(false) }}
              style={{ padding: '9px 12px', fontFamily: MONO, fontSize: 10, cursor: 'pointer', background: hovered === p._id ? GOLD : 'transparent', color: hovered === p._id ? '#000' : '#e8e8e8', borderBottom: '1px solid #0f0f0f' }}>
              {p.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e',
  borderBottom: '1px solid #333', color: '#e8e8e8', fontFamily: SANS,
  fontSize: 12, padding: '10px 12px', outline: 'none',
  boxSizing: 'border-box', display: 'block',
}

function Label({ children, required }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
      <span>{children}</span>
      {required && <span style={{ color: GOLD }}>required</span>}
    </div>
  )
}

function Hint({ children }) {
  return <div style={{ fontFamily: MONO, fontSize: 7, color: '#252525', letterSpacing: '0.08em', marginTop: 4 }}>{children}</div>
}

const WaxSeal = ({ size = 80 }) => (
  <img src="/portal/images/STAMP7.png" alt="Blkuzz stamp" width={size} height={size} style={{ objectFit: 'contain', filter: `drop-shadow(0 6px 20px ${GOLD}35)` }} />
)

const SmallSeal = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d="M12 2C13.5 1.5 16 3 18 4.5C20 6 21.5 8.5 22 11C22.5 13.5 21.5 16 20 18C18.5 20 16 21.5 13 22C10 22.5 7 21.5 5 20C3 18.5 1.5 16 1 13C0.5 10 1.5 7 3 5C4.5 3 7 1.5 9 1C10 0.7 11 2 12 2Z" fill={GOLD} fillOpacity="0.2" stroke={GOLD} strokeWidth="0.5" />
    <text x="12" y="15.5" textAnchor="middle" fontFamily="Georgia,serif" fontSize="8" fill={GOLD}>B</text>
  </svg>
)

export default function WorkWithUsPage() {
  const [config, setConfig]         = useState({ slotsRemaining: 3, currentQuarter: 'Q3' })
  const [existing, setExisting]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [form, setForm]             = useState({ projectTitle: '', membersInvolved: [], pitch: '', workLink: '', mediaFiles: [], supportNeeded: '', existingProject: null, linkedProjectId: '' })
  const [allMembers, setAllMembers] = useState([])
  const [myProjects, setMyProjects] = useState([])
  const [submitState, setSubmitState] = useState('idle')
  const [errorMsg, setErrorMsg]     = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch('/api/config').then(r => r.json()),
      apiFetch('/api/pitch').then(r => r.json()),
      apiFetch('/api/directory').then(r => r.json()),
      apiFetch('/api/projects?mine=1').then(r => r.json()),
    ]).then(([cfg, pitchData, members, projects]) => {
      setConfig(cfg)
      setExisting(pitchData.existing || null)
      if (Array.isArray(members)) setAllMembers(members)
      if (Array.isArray(projects)) setMyProjects(projects)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setSubmitState('submitting')
    setErrorMsg('')
    try {
      const payload = { ...form, membersInvolved: form.membersInvolved.map(m => m.id), mediaFiles: form.mediaFiles.map(f => f.url) }
      const res  = await apiFetch('/api/pitch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || 'Something went wrong.'); setSubmitState('error'); return }
      setSubmitState('done')
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setSubmitState('error')
    }
  }

  const closed = config.slotsRemaining <= 0

  return (
    <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#e8e8e8', fontFamily: SANS, overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <span className="font-head" style={{ fontSize: 15, letterSpacing: '2px', color: '#FDC214' }}>BLKUZZ</span>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', color: GOLD, border: `1px solid ${GOLD}30`, padding: '3px 8px' }}>
          {loading ? '—' : closed ? `Closed · ${config.currentQuarter}` : `${config.slotsRemaining} slots remaining · ${config.currentQuarter}`}
        </div>
      </div>

      {/* Two-column body — stacks vertically with one shared scroll on mobile; side-by-side with independent column scroll at lg+ */}
      <div className="flex-col lg:flex-row overflow-y-auto lg:overflow-visible" style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* LEFT — editorial */}
        <div className="w-full lg:w-[44%] lg:overflow-y-auto" style={{ borderRight: '1px solid #141414', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column' }}>

          {/* Hero */}
          <div style={{ position: 'relative', padding: '52px 32px 48px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${GOLD}12 0%, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, #ffffff02 3px, #ffffff02 4px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ marginBottom: 28 }}><WaxSeal size={200} /></div>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.35em', color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>We want to hear from you</div>
              <h1 style={{ fontSize: 52, lineHeight: 1.05, marginBottom: 0 }}>
                <span className="font-head" style={{ letterSpacing: '2px', color: '#fff' }}>Work </span>
                <em style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, color: GOLD }}>with</em>
                <br />
                <span className="font-head" style={{ letterSpacing: '2px', color: '#fff' }}>Blkuzz</span>
              </h1>
              <div style={{ width: 40, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: '20px auto' }} />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, maxWidth: 300, textAlign: 'center' }}>
                We select a small number of projects each quarter to develop into Blkuzz company content. If you have a project you&apos;d like to work on, get in touch.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', borderBottom: '1px solid #141414', flexShrink: 0 }}>
            {[
              { num: loading ? '—' : config.slotsRemaining, label: 'Slots\nthis quarter' },
              { num: '14', label: 'Days to\nrespond' },
              { num: loading ? '—' : config.currentQuarter, label: 'Current\nintake' },
            ].map((s, i, arr) => (
              <div key={i} style={{ flex: 1, padding: '18px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, borderRight: i < arr.length - 1 ? '1px solid #141414' : 'none' }}>
                <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: GOLD, lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* What selection means */}
          <div style={{ padding: '24px 24px 32px', flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              What selection means
              <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { num: '01', title: 'Blkuzz production support', desc: 'We co-produce your project. Resources, time, and our network behind your work.', accent: GOLD },
                { num: '02', title: 'Platform distribution',     desc: 'Your work becomes Blkuzz content, pushed to the full member base and beyond.',  accent: '#00ff88' },
                { num: '03', title: 'Creative direction access', desc: 'Direct collaboration with the Blkuzz team on positioning, narrative and output.', accent: '#00aaff' },
                { num: '04', title: 'Permanent record',          desc: 'Selected projects are archived as official Blkuzz works. Your name on them. Forever.', accent: '#e8ff00' },
              ].map(item => (
                <div key={item.num} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #0f0f0f', alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: MONO, fontSize: 8, color: item.accent, letterSpacing: '0.1em', opacity: 0.7, flexShrink: 0, paddingTop: 2 }}>{item.num}</div>
                  <div style={{ flex: 1, borderLeft: `2px solid ${item.accent}30`, paddingLeft: 12 }}>
                    <div className="font-head" style={{ fontSize: 11, letterSpacing: '2px', color: '#e8e8e8', marginBottom: 4, lineHeight: 1.3 }}>{item.title}</div>
                    <div style={{ fontSize: 10, color: '#FDC214', lineHeight: 1.55 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT — form */}
        <div className="lg:overflow-y-auto" style={{ flex: 1, scrollbarWidth: 'none', display: 'flex', flexDirection: 'column' }}>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8, color: '#222', letterSpacing: '0.2em' }}>—</div>

          ) : submitState === 'done' ? (
            <div className="px-6 lg:px-12" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, paddingTop: 40, paddingBottom: 40, textAlign: 'center' }}>
              <WaxSeal size={180} />
              <div style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 600, color: '#fff', lineHeight: 1.15 }}>
                Your submission<br />has been received.
              </div>
              <div style={{ width: 40, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', lineHeight: 2 }}>
                We will respond within 14 days.
              </div>
            </div>

          ) : closed ? (
            <div className="px-6 lg:px-12" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 48, paddingBottom: 48, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                Submissions for {config.currentQuarter} are now closed.
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 20, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Check back next quarter.</div>
            </div>

          ) : existing ? (
            <div className="px-6 lg:px-12" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, paddingTop: 40, paddingBottom: 40, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.3em', color: GOLD, textTransform: 'uppercase', border: `1px solid ${GOLD}30`, padding: '4px 12px' }}>Under review</div>
              <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>&quot;{existing.projectTitle}&quot;</div>
              <div style={{ width: 40, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', lineHeight: 2 }}>
                Submitted {new Date(existing.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                We will respond within 14 days.
              </div>
            </div>

          ) : (
            <div className="px-6 lg:px-12" style={{ paddingTop: 40, paddingBottom: 40 }}>
              <div style={{ marginBottom: 32 }}>
                <div className="font-head" style={{ fontSize: 22, letterSpacing: '2px', color: GOLD, marginBottom: 6 }}>Submit your pitch</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{config.currentQuarter} 2026 · Closes when slots fill</div>
              </div>

              <form onSubmit={submit}>
                <div style={{ marginBottom: 18 }}>
                  <Label required>Project title</Label>
                  <input name="projectTitle" value={form.projectTitle} onChange={handle} required placeholder="What's the name of your project?" className="placeholder-white" style={inputStyle} />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <Label>Members Involved</Label>
                  <MembersSelect
                    selected={form.membersInvolved}
                    onChange={members => setForm(f => ({ ...f, membersInvolved: members }))}
                    allMembers={allMembers}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <Label required>The pitch</Label>
                  <textarea name="pitch" value={form.pitch} onChange={handle} required placeholder="What is it. Why does it matter. Why now. Why you." className="placeholder-white" style={{ ...inputStyle, resize: 'none', height: 120, lineHeight: 1.65 }} />
                  <Hint>No decks. No jargon. Just the truth of the project.</Hint>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <Label>Member code</Label>
                  <input name="workLink" value={form.workLink} onChange={handle} placeholder="We want to see your portfolio" className="placeholder-white" style={inputStyle} />
                  <Hint>This will link us to your Blkuzz profile</Hint>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <Label>Media</Label>
                  <MediaUpload
                    files={form.mediaFiles}
                    onChange={mediaFiles => setForm(f => ({ ...f, mediaFiles }))}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <Label>Existing project</Label>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 10 }}>Is this an existing Blkuzz project?</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Yes', 'No'].map(opt => {
                      const val = opt === 'Yes'
                      const active = form.existingProject === val
                      return (
                        <button key={opt} type="button"
                          onClick={() => setForm(f => ({ ...f, existingProject: f.existingProject === val ? null : val, linkedProjectId: val ? f.linkedProjectId : '' }))}
                          style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.15em', padding: '6px 20px', borderRadius: 9999, border: `1px solid ${active ? GOLD : '#2a2a2a'}`, background: 'transparent', color: active ? GOLD : '#444', cursor: 'pointer', transition: 'all 0.15s' }}>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {form.existingProject === true && (
                    <div style={{ marginTop: 10 }}>
                      {myProjects.length === 0 ? (
                        <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(255,255,255,0.4)', padding: '10px 12px', border: '1px solid #1e1e1e' }}>No projects found in your account.</div>
                      ) : (
                        <ProjectSelect
                          value={form.linkedProjectId}
                          onChange={id => setForm(f => ({ ...f, linkedProjectId: id }))}
                          projects={myProjects}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #1e1e1e, transparent)', margin: '22px 0' }} />

                <div style={{ marginBottom: 28 }}>
                  <Label>What you need from us</Label>
                  <input name="supportNeeded" value={form.supportNeeded} onChange={handle} placeholder="Tell us what you'd like to gain from collaborating with us" className="placeholder-white" style={inputStyle} />
                  <Hint>Optional but it helps us understand what collaboration means for you.</Hint>
                </div>

                {errorMsg && (
                  <div style={{ fontFamily: MONO, fontSize: 8, color: '#D2042D', letterSpacing: '0.08em', marginBottom: 14 }}>{errorMsg}</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <button type="submit" disabled={submitState === 'submitting'} style={{ width: 'fit-content', alignSelf: 'center', background: 'transparent', border: `1px solid ${GOLD}`, borderRadius: 9999, color: GOLD, fontFamily: MONO, fontSize: 10, letterSpacing: '0.25em', padding: '12px 32px', cursor: 'pointer', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative', overflow: 'hidden', opacity: submitState === 'submitting' ? 0.6 : 1, transition: 'background 0.15s' }}>
                    <SmallSeal />
                    {submitState === 'submitting' ? 'Sending...' : 'Seal and submit'}
                  </button>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textAlign: 'center', lineHeight: 1.9 }}>
                    Submissions are reviewed by the Blkuzz team only.<br />
                    We respond within 14 days. Denied submissions are not a reflection of your work.
                  </div>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
