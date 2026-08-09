'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { Globe } from 'lucide-react'

const iStyle = (disabled) => ({
  width: '100%',
  background: disabled ? 'transparent' : '#0d0d0d',
  border: '1px solid #444',
  color: disabled ? '#333' : '#e8e8e8',
  fontFamily: 'Space Grotesk, sans-serif',
  fontSize: 12,
  padding: '9px 12px',
  outline: 'none',
  cursor: disabled ? 'not-allowed' : 'text',
})

const taStyle = () => ({
  width: '100%',
  background: '#0d0d0d',
  border: '1px solid #1e1e1e',
  borderBottom: '1px solid #333',
  color: '#e8e8e8',
  fontFamily: 'Space Grotesk, sans-serif',
  fontSize: 12,
  padding: '9px 12px',
  outline: 'none',
  resize: 'none',
  height: 80,
  lineHeight: 1.55,
})

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.25em', color: '#2a2a2a', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
      <div style={{ flex: 1, height: 1, background: '#141414' }} />
    </div>
  )
}

function Hint({ children, style }) {
  return <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#2a2a2a', letterSpacing: '0.06em', marginTop: 4, ...style }}>{children}</div>
}

export default function EditProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [profile, setProfile]     = useState(null)
  const [form, setForm]           = useState({
    username: '', bio: '', location: '', portfolio: '',
    tags: [], skills: [], showInDirectory: true, showProjects: true,
  })
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [locationError, setLocationError]   = useState('')
  const [usernameError, setUsernameError]   = useState('')
  const [usernameCooldown, setUsernameCooldown] = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [availableTags, setAvailableTags] = useState([])
  const photoInputRef = useRef(null)

  useEffect(() => {
    apiFetch('/api/profile').then(r => r.json()).then(data => {
      setProfile(data)
      setForm({
        username:        data.username || '',
        bio:             data.bio || '',
        location:        data.location || '',
        portfolio:       data.links?.portfolio || '',
        tags:            data.tags || [],
        skills:          data.skills || [],

        showInDirectory: data.showInDirectory ?? true,
        showProjects:    data.showProjects ?? true,
      })
      if (data.usernameChangedAt) {
        const daysSince = (Date.now() - new Date(data.usernameChangedAt)) / 86400000
        if (daysSince < 14) setUsernameCooldown(Math.ceil(14 - daysSince))
      }
    })
  }, [])

  useEffect(() => {
    apiFetch('/api/tags').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAvailableTags(data)
    })
  }, [])

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setSaved(false) }

  const addSkill = () => {
    const s = skillInput.trim()
    if (!s || form.skills.includes(s) || form.skills.length >= 20) return
    set('skills', [...form.skills, s])
    setSkillInput('')
  }

  const handlePhotoUpload = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'avatar')
    const res  = await apiFetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.url) { setProfile(p => ({ ...p, profileImage: data.url, avatar: null })); setSaved(false) }
    setUploading(false)
  }

  const save = async () => {
    if (form.location && !form.location.includes(',')) {
      setLocationError('Format must be: City, Country (e.g. London, UK)')
      return
    }
    setLocationError('')
    setUsernameError('')
    setSaving(true)
    const res = await apiFetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username:        form.username,
        bio:             form.bio,
        location:        form.location,
        profileImage:    profile?.profileImage || '',
        links:           { portfolio: form.portfolio },
        tags:            form.tags,
        skills:          form.skills,

        showInDirectory: form.showInDirectory,
        showProjects:    form.showProjects,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      if (res.status === 409 || res.status === 429 || res.status === 400) {
        setUsernameError(data.error)
        if (data.daysLeft) setUsernameCooldown(data.daysLeft)
      }
      return
    }
    setSaved(true)
  }

  const initials  = profile ? (profile.name || profile.username || '?').slice(0, 2).toUpperCase() : '??'
  const photo     = profile?.profileImage || profile?.avatar?.url || null
  const memberCode = profile?.blkuzzId || (() => {
    const n = parseInt(String(profile?._id).slice(-6), 16) % 9999 + 1
    return `BLK-${String(n).padStart(4, '0')}`
  })()

  if (!profile) return (
    <div style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#2a2a2a', letterSpacing: '0.25em' }}>
      LOADING...
    </div>
  )

  return (
    <div style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#e8e8e8', overflow: 'hidden' }}>

      {/* Classified band */}
      <div style={{ background: '#ff4444', padding: '4px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.35em', color: '#fff', textTransform: 'uppercase' }}>✎ Editing member file</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>FILE #{memberCode}</span>
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <span className="font-head" style={{ fontSize: 15, letterSpacing: '2px', color: '#FDC214' }}>BLKUZZ</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.back()} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', padding: '7px 16px', background: 'transparent', color: '#555', border: '1px solid #2a2a2a', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', borderRadius: 9999 }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.15em', padding: '7px 16px', background: '#FDC214', color: '#0a0a0a', border: 'none', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', borderRadius: 9999, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* Page header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #141414' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.2em', color: '#2a2a2a', textTransform: 'uppercase', marginBottom: 3 }}>Member file — edit mode</div>
          <div className="font-head" style={{ fontSize: 20, letterSpacing: '2px', color: '#fff' }}>Edit Profile</div>
        </div>

        {/* Photo */}
        <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 72, height: 86, border: '1px solid #2a2a2a', position: 'relative', overflow: 'hidden', background: '#001a0d', flexShrink: 0 }}>
            {photo ? (
              <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#00ff8806 1px, transparent 1px), linear-gradient(90deg, #00ff8806 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 22, color: '#00ff8840', zIndex: 1 }}>{initials}</div>
              </>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 6, letterSpacing: '0.12em', color: '#00ff8880', textAlign: 'center', padding: '2px 0', textTransform: 'uppercase', zIndex: 2 }}>ID Photo</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.2em', color: '#333', textTransform: 'uppercase', marginBottom: 6 }}>Member ID Photo</div>
<input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => photoInputRef.current?.click()} disabled={uploading}
                style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.1em', padding: '5px 10px', border: '1px solid #00ff8840', color: '#00ff88', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>
              {photo && (
                <button onClick={() => { setProfile(p => ({ ...p, profileImage: '', avatar: null })); setSaved(false) }}
                  style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.1em', padding: '5px 10px', border: '1px solid #ff000040', color: '#ff0000', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Identity */}
        <div style={{ padding: '14px 16px' }}>
          <SectionLabel>Identity</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.18em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>Username</div>
              <input
                value={form.username}
                disabled={!!usernameCooldown}
                onChange={e => { set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setUsernameError('') }}
                placeholder="username"
                style={{ ...iStyle(!!usernameCooldown), ...(usernameError ? { border: '1px solid #ff4444', borderBottom: '1px solid #ff4444' } : {}) }}
              />
              {usernameError
                ? <Hint style={{ color: '#ff4444' }}>{usernameError}</Hint>
                : usernameCooldown
                  ? <Hint style={{ color: '#555' }}>Change available in {usernameCooldown} day{usernameCooldown === 1 ? '' : 's'}</Hint>
                  : <Hint>3–20 chars · letters, numbers, underscores · changed once per 14 days</Hint>
              }
            </div>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.18em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>Location</div>
              <input value={form.location} onChange={e => { set('location', e.target.value); setLocationError('') }} placeholder="City, UK" style={{ ...iStyle(), ...(locationError ? { border: '1px solid #ff4444', borderBottom: '1px solid #ff4444' } : {}) }} />
              {locationError ? <Hint style={{ color: '#ff4444' }}>{locationError}</Hint> : <Hint>Format: City, UK</Hint>}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.18em', color: '#444', textTransform: 'uppercase', marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
              <span>Bio</span>
              <span style={{ fontSize: 7, color: '#2a2a2a' }}>{form.bio.length}/500</span>
            </div>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} maxLength={500} rows={3}
              placeholder="What you do, what you're working on, what you're looking for..."
              style={taStyle()} />
          </div>
        </div>

        {/* Tags */}
        <div style={{ padding: '14px 16px' }}>
          <SectionLabel>Tags</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {availableTags.map(tag => {
              const active = form.tags.includes(tag)
              return (
                <button key={tag} onClick={() => set('tags', active ? form.tags.filter(t => t !== tag) : [...form.tags, tag])}
                  style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.1em', padding: '5px 10px', border: `1px solid ${active ? '#FDC214' : '#1e1e1e'}`, color: active ? '#FDC214' : '#444', cursor: 'pointer', textTransform: 'uppercase', background: 'transparent', transition: 'all 0.1s', borderRadius: 9999 }}>
                  {tag}
                </button>
              )
            })}
          </div>
          <Hint>Select all that apply. These appear on your profile and help others find you.</Hint>
        </div>

        {/* Skills */}
        <div style={{ padding: '14px 16px' }}>
          <SectionLabel>Skills</SectionLabel>
          {form.skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {form.skills.map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.08em', padding: '4px 10px', border: '1px solid #FDC21440', color: '#FDC214', textTransform: 'uppercase', background: 'transparent', borderRadius: 9999 }}>
                  {s}
                  <span onClick={() => set('skills', form.skills.filter(x => x !== s))} style={{ cursor: 'pointer', color: '#FDC21460', fontSize: 10, lineHeight: 1 }}>×</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="Add a skill..."
              style={{ flex: 1, background: '#0d0d0d', border: '1px solid #1e1e1e', borderBottom: '1px solid #333', color: '#e8e8e8', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, padding: '7px 10px', outline: 'none', letterSpacing: '0.05em' }} />
            <button onClick={addSkill}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.1em', padding: '7px 12px', border: '1px solid #1e1e1e', color: '#555', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              + Add
            </button>
          </div>
          <Hint style={{ marginTop: 6 }}>Be specific — &quot;Portrait photography&quot; over &quot;Photography&quot;. · {form.skills.length}/20</Hint>
        </div>

        {/* Availability */}
        <div style={{ padding: '14px 16px' }}>
          <SectionLabel>Availability</SectionLabel>
          {[

            { key: 'showInDirectory', title: 'Appear in directory',             sub: "If off, your profile won't show in member search results." },
            { key: 'showProjects',    title: 'Show active projects on profile', sub: 'Displays your current projects on your public dossier.' },
          ].map(({ key, title, sub }, i, arr) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#ccc', letterSpacing: '-0.01em', marginBottom: 2 }}>{title}</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#2a2a2a', letterSpacing: '0.06em' }}>{sub}</div>
              </div>
              <div onClick={() => set(key, !form[key])}
                style={{ width: 36, height: 20, borderRadius: 10, background: form[key] ? '#FDC21430' : '#1a1a1a', border: `1px solid ${form[key] ? '#FDC21440' : '#2a2a2a'}`, position: 'relative', cursor: 'pointer', flexShrink: 0, marginLeft: 16, transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: form[key] ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: form[key] ? '#FDC214' : '#333', transition: 'all 0.2s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Links */}
        <div style={{ padding: '14px 16px' }}>
          <SectionLabel>Links</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Globe size={16} strokeWidth={1.5} style={{ color: '#FDC214' }} />
            </div>
            <input value={form.portfolio} onChange={e => set('portfolio', e.target.value)} placeholder="Website URL" style={{ ...iStyle(), margin: 0 }} />
          </div>
        </div>

      </div>
    </div>
  )
}
