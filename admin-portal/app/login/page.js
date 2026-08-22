'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const MONO = 'IBM Plex Mono, monospace'

export default function AdminLogin() {
  const router   = useRouter()
  const [pw, setPw]       = useState('')
  const [err, setErr]     = useState('')
  const [busy, setBusy]   = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const res = await signIn('credentials', { password: pw, redirect: false })
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setErr('Access denied.')
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
      <div style={{ width: 320 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <img src="/bz-admin/images/blkuzz-logo.png" alt="Blkuzz" style={{ height: 88, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: '#ff4444', border: '1px solid #ff444430', display: 'inline-block', padding: '2px 8px', textTransform: 'uppercase', borderRadius: 9999 }}>Control Centre</div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            placeholder="Enter access key"
            value={pw}
            onChange={e => setPw(e.target.value)}
            style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', color: '#e8e8e8', fontFamily: MONO, fontSize: 11, padding: '10px 12px', outline: 'none', letterSpacing: '0.1em', borderRadius: 9999, textAlign: 'center' }}
            autoFocus
          />
          {err && <div style={{ fontFamily: MONO, fontSize: 8, color: '#ff4444', letterSpacing: '0.1em' }}>{err}</div>}
          <button type="submit" disabled={busy || !pw}
            style={{ background: 'transparent', border: '1px solid #e8ff0040', color: '#e8ff00', fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', padding: '10px', cursor: 'pointer', textTransform: 'uppercase', opacity: busy ? 0.5 : 1, borderRadius: 9999 }}>
            {busy ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
