'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'

const MONO = 'IBM Plex Mono, monospace'

function Avatar({ user, size = 36 }) {
  const url = user?.avatar?.url || user?.profileImage || null
  const [ok, setOk] = useState(!!url)
  const initials = (user?.username ?? '?').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontFamily: MONO, fontSize: size * 0.28, color: '#FDC214' }}>
      {ok && url ? <img src={url} alt="" onError={() => setOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  )
}

export default function BlockedPage() {
  const router = useRouter()
  const [blocks, setBlocks]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [unbocking, setUnblocking] = useState(null)

  const load = () => {
    setLoading(true)
    apiFetch('/api/block').then(r => r.json()).then(data => {
      setBlocks(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const unblock = async (userId) => {
    setUnblocking(userId)
    await apiFetch(`/api/block/${userId}`, { method: 'DELETE' })
    setBlocks(prev => prev.filter(b => b.blocked._id !== userId && b.blocked !== userId))
    setUnblocking(null)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', marginBottom: 28, fontFamily: MONO, fontSize: 9, letterSpacing: '0.15em' }}>
        <ArrowLeft size={13} /> BACK
      </button>

      <h1 className="font-head" style={{ fontSize: 15, color: '#FDC214', letterSpacing: '3px', marginBottom: 6 }}>BLOCKED MEMBERS</h1>
      <p style={{ fontFamily: MONO, fontSize: 8, color: '#333', letterSpacing: '0.1em', marginBottom: 28 }}>
        Members you have blocked. They cannot contact you or find you in the directory.
      </p>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, fontFamily: MONO, fontSize: 9, color: '#2a2a2a', letterSpacing: '0.25em' }}>LOADING...</div>
      ) : blocks.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 9, color: '#2a2a2a', letterSpacing: '0.15em', textAlign: 'center', padding: '48px 0' }}>No blocked members.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {blocks.map(b => {
            const user = b.blocked
            const uid  = user?._id ?? user
            return (
              <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #111' }}>
                <Avatar user={user} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="font-head" style={{ fontSize: 11, color: '#fff', letterSpacing: '2px', marginBottom: 2 }}>
                    {user?.name || user?.username || 'Unknown'}
                  </p>
                  <p style={{ fontFamily: MONO, fontSize: 8, color: '#444' }}>@{user?.username}</p>
                </div>
                <button
                  onClick={() => unblock(uid)}
                  disabled={unbocking === uid}
                  style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #333', color: '#555', fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer' }}>
                  {unbocking === uid ? '...' : 'UNBLOCK'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
