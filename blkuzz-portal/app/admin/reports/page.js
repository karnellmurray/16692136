'use client'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

const MONO = 'IBM Plex Mono, monospace'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  if (s < 2629800) return `${Math.floor(s / 604800)}w ago`
  if (s < 31557600) return `${Math.floor(s / 2629800)}mo ago`
  return `${Math.floor(s / 31557600)}y ago`
}

const STATUS_COLOR = { pending: '#FDC214', reviewed: '#00ff88', actioned: '#D2042D' }

export default function AdminReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  const load = () => {
    setLoading(true)
    apiFetch('/api/admin/reports').then(r => r.json()).then(data => {
      setReports(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id, status) => {
    await apiFetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setReports(prev => prev.map(r => r._id === id ? { ...r, status } : r))
  }

  const visible = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.25em', color: '#FDC214' }}>FLAGGED MEMBERS</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending', 'reviewed', 'actioned'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '4px 12px', background: 'transparent', border: `1px solid ${filter === f ? '#FDC214' : '#222'}`, color: filter === f ? '#FDC214' : '#444', fontFamily: MONO, fontSize: 7, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, fontFamily: MONO, fontSize: 9, color: '#2a2a2a', letterSpacing: '0.25em' }}>LOADING...</div>
      ) : visible.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 9, color: '#2a2a2a', letterSpacing: '0.15em', padding: '48px 0', textAlign: 'center' }}>No reports.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              {['Reported', 'Reported by', 'Context', 'Time', 'Status', ''].map(h => (
                <th key={h} style={{ fontFamily: MONO, fontSize: 7, color: '#333', letterSpacing: '0.15em', textAlign: 'left', padding: '8px 12px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r._id} style={{ borderBottom: '1px solid #111' }}>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#fff' }}>@{r.reported?.username ?? '—'}</span>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: '#555' }}>@{r.reportedBy?.username ?? '—'}</span>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{r.context}</span>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: '#333' }}>{timeAgo(r.createdAt)}</span>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: STATUS_COLOR[r.status] ?? '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.status}</span>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => updateStatus(r._id, 'reviewed')}
                        style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #00ff88', color: '#00ff88', fontFamily: MONO, fontSize: 7, letterSpacing: '0.08em', cursor: 'pointer' }}>
                        REVIEWED
                      </button>
                      <button onClick={() => updateStatus(r._id, 'actioned')}
                        style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #D2042D', color: '#D2042D', fontFamily: MONO, fontSize: 7, letterSpacing: '0.08em', cursor: 'pointer' }}>
                        ACTIONED
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
