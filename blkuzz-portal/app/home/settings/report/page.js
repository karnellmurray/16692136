'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'

const MONO = 'IBM Plex Mono, monospace'
const MAX_DESCRIPTION_LEN = 5000

export default function ReportBugPage() {
  const router = useRouter()
  const [subject, setSubject]         = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState(null)
  const [sent, setSent]               = useState(false)

  const canSubmit = subject.trim().length > 0 && description.trim().length > 0 && !submitting

  const submit = async e => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res  = await apiFetch('/api/settings/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), description: description.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send report.')
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%', background: '#0d0d0d', border: '1px solid #222', color: '#e8e8e8',
    fontFamily: MONO, fontSize: 14, padding: '12px 14px', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#777', cursor: 'pointer', marginBottom: 28, fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em' }}>
        <ArrowLeft size={15} /> BACK
      </button>

      <h1 className="font-head" style={{ fontSize: 20, color: '#FDC214', letterSpacing: '3px', marginBottom: 8 }}>REPORT BUGS</h1>
      <p style={{ fontFamily: MONO, fontSize: 11, color: '#777', letterSpacing: '0.05em', lineHeight: 1.6, marginBottom: 28 }}>
        Found something broken? Let us know and we'll take a look. Reports go straight to Headquarters.
      </p>

      {sent ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: MONO, fontSize: 13, color: '#008000', letterSpacing: '0.15em', marginBottom: 16 }}>REPORT SENT — THANK YOU</p>
          <button onClick={() => router.back()}
            style={{ padding: '10px 24px', background: 'transparent', border: '1px solid #333', color: '#777', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer' }}>
            BACK TO SETTINGS
          </button>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', color: '#777', textTransform: 'uppercase', marginBottom: 8 }}>
              Subject
            </label>
            <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}
              placeholder="Short summary of the bug" style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', color: '#777', textTransform: 'uppercase', marginBottom: 8 }}>
              What happened?
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LEN))} rows={7}
              placeholder="What were you doing, what did you expect, and what happened instead?"
              style={{ ...inputStyle, resize: 'none', fontFamily: 'Space Grotesk, sans-serif', fontSize: 15, lineHeight: 1.5 }} />
            <p style={{ fontFamily: MONO, fontSize: 10, color: '#777', marginTop: 6, textAlign: 'right' }}>
              {description.length}/{MAX_DESCRIPTION_LEN}
            </p>
          </div>

          {error && (
            <p style={{ fontFamily: MONO, fontSize: 11, color: '#D2042D', letterSpacing: '0.05em' }}>{error}</p>
          )}

          <button type="submit" disabled={!canSubmit}
            style={{ alignSelf: 'flex-start', padding: '12px 30px', background: canSubmit ? '#FDC214' : '#333', color: canSubmit ? '#0a0a0a' : '#777', border: 'none', borderRadius: 9999, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: canSubmit ? 'pointer' : 'default' }}>
            {submitting ? 'Sending…' : 'Send Report'}
          </button>
        </form>
      )}
    </div>
  )
}
