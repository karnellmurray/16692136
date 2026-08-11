'use client'
import { useState, useMemo, useEffect } from 'react'

const MONO  = 'IBM Plex Mono, monospace'
const GOLD  = '#e8ff00'
const GREEN = '#00ff88'
const RED   = '#FF0000'
const MAX_LEN = 160

function blkId(m) {
  if (m.blkuzzId) return m.blkuzzId
  const n = parseInt(String(m._id).slice(-6), 16) % 9999 + 1
  return `BLK-${String(n).padStart(4, '0')}`
}

function MiniAvatar({ m, size = 28 }) {
  const initial = (m.username?.[0] ?? m.name?.[0] ?? '?').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: '#0d0d0d', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {m.avatarUrl
        ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: MONO, fontSize: size * 0.36, fontWeight: 700, color: '#777' }}>{initial}</span>
      }
    </div>
  )
}

function MemberPickerModal({ members, selectedIds, onToggle, onClose }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = (members ?? []).filter(m =>
    !q || m.username?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q) || blkId(m).toLowerCase().includes(q)
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: 440, maxHeight: '80vh', background: '#0d0d0d', border: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: '16px 18px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', color: GOLD, textTransform: 'uppercase' }}>Select members</div>
          <span onClick={onClose} style={{ fontFamily: MONO, fontSize: 16, color: '#666', cursor: 'pointer', lineHeight: 1 }}>×</span>
        </div>

        <div style={{ padding: '14px 18px 10px', flexShrink: 0 }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, username or BLK ID..."
            style={{ width: '100%', background: '#080808', border: `1px solid ${GOLD}60`, color: '#e8e8e8', fontFamily: MONO, fontSize: 11, padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: 9999 }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 10px 10px' }}>
          {filtered.length === 0 && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', textAlign: 'center', padding: '24px 0' }}>
              {members?.length ? 'No members found.' : 'Loading...'}
            </div>
          )}
          {filtered.map(m => {
            const isSel = selectedIds.has(m._id)
            return (
              <div key={m._id} onClick={() => onToggle(m)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', cursor: 'pointer', border: isSel ? `1px solid ${GOLD}40` : '1px solid transparent', background: isSel ? '#1a1700' : 'transparent', marginBottom: 2 }}>
                <MiniAvatar m={m} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.username}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: '#666' }}>@{m.username} · {blkId(m)}</div>
                </div>
                <div style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${isSel ? GOLD : '#333'}`, background: isSel ? GOLD : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#000', fontWeight: 700 }}>
                  {isSel ? '✓' : ''}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '14px 18px', borderTop: '1px solid #141414', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ width: '100%', fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', padding: '11px 0', background: GOLD, border: 'none', color: '#000', textTransform: 'uppercase', cursor: 'pointer' }}>
            Done ({selectedIds.size} selected)
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BroadcastView({ members }) {
  const [mode, setMode]           = useState('all') // 'all' | 'specific'
  const [message, setMessage]     = useState('')
  const [selected, setSelected]   = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending]     = useState(false)
  const [result, setResult]       = useState(null) // { sent, skipped, skippedReasons } | { error }
  const [logs, setLogs]           = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const loadLogs = async () => {
    setLogsLoading(true)
    const data = await fetch('/bz-admin/api/broadcast').then(r => r.json()).catch(() => [])
    setLogs(Array.isArray(data) ? data : [])
    setLogsLoading(false)
  }

  useEffect(() => { loadLogs() }, [])

  const deleteLog = async id => {
    if (deletingId) return
    if (!window.confirm('Delete this broadcast log entry?')) return
    setDeletingId(id)
    await fetch('/bz-admin/api/broadcast', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setLogs(ls => ls.filter(l => l._id !== id))
    setDeletingId(null)
  }

  const selectedIds = useMemo(() => new Set(selected.map(m => m._id)), [selected])

  const togglePick = m => setSelected(s => s.some(x => x._id === m._id) ? s.filter(x => x._id !== m._id) : [...s, m])
  const removeMember = id => setSelected(s => s.filter(m => m._id !== id))

  const canSend = message.trim().length > 0 && (mode === 'all' || selected.length > 0)

  const send = async () => {
    setSending(true)
    setResult(null)
    try {
      const res  = await fetch('/bz-admin/api/broadcast', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message, recipients: mode === 'all' ? 'all' : selected.map(m => m._id) }),
      })
      const data = await res.json()
      if (!res.ok) { setResult({ error: data.error || 'Something went wrong.' }); return }
      setResult(data)
      setMessage('')
      setSelected([])
      loadLogs()
    } catch {
      setResult({ error: 'Something went wrong.' })
    } finally {
      setSending(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div>
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #141414', background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 4 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: '#444', textTransform: 'uppercase', marginBottom: 3 }}>Blkuzz HQ · Members</div>
        <div style={{ fontFamily: 'Boldstrom, sans-serif', fontSize: 21, letterSpacing: '2px', color: '#fff' }}>Broadcast</div>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 920, margin: '0 auto' }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 1, marginBottom: 22, background: '#141414' }}>
          {[{ key: 'all', label: 'Send to All' }, { key: 'specific', label: 'Send to Specific Members' }].map(o => (
            <button key={o.key} onClick={() => { setMode(o.key); setResult(null) }}
              style={{ flex: 1, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', padding: '14px 8px', textTransform: 'uppercase', cursor: 'pointer', border: 'none', background: mode === o.key ? '#0d0d0d' : 'transparent', color: mode === o.key ? GOLD : '#666' }}>
              {o.label}
            </button>
          ))}
        </div>

        {mode === 'specific' && (
          <div style={{ marginBottom: 14 }}>
            {selected.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {selected.map(m => (
                  <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', padding: '4px 8px', border: `1px solid ${GOLD}40`, color: GOLD, borderRadius: 9999 }}>
                    {blkId(m)} · @{m.username}
                    <span onClick={() => removeMember(m._id)} style={{ cursor: 'pointer', opacity: 0.6, marginLeft: 2 }}>×</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setPickerOpen(true)}
              style={{ width: '100%', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', padding: '13px 14px', textTransform: 'uppercase', cursor: 'pointer', border: '1px dashed #333', background: 'transparent', color: '#888', textAlign: 'center' }}>
              + Select members
            </button>
          </div>
        )}

        {/* Message */}
        <div style={{ marginBottom: 4 }}>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, MAX_LEN))}
            maxLength={MAX_LEN}
            rows={6}
            placeholder="Write your message..."
            style={{ width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e', color: '#e8e8e8', fontFamily: MONO, fontSize: 14, padding: '14px 16px', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
          />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: message.length >= MAX_LEN ? RED : '#555', textAlign: 'right', marginBottom: 14 }}>
          {message.length}/{MAX_LEN}
        </div>

        {result?.error && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: RED, marginBottom: 12 }}>{result.error}</div>
        )}
        {result && !result.error && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: GREEN }}>
              Sent to {result.sent} member{result.sent === 1 ? '' : 's'}{result.skipped ? `, skipped ${result.skipped}` : ''}.
            </div>
            {result.skippedReasons?.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {result.skippedReasons.map((s, i) => (
                  <div key={i} style={{ fontFamily: MONO, fontSize: 10, color: '#999' }}>{s.user} — {s.reason}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!canSend}
          style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.15em', padding: '13px 26px', border: `1px solid ${GOLD}60`, color: GOLD, background: 'transparent', cursor: canSend ? 'pointer' : 'not-allowed', textTransform: 'uppercase', opacity: canSend ? 1 : 0.4 }}>
          {mode === 'all' ? 'Send to all members' : 'Send to selected'}
        </button>
      </div>

      {/* Log table */}
      <div style={{ padding: '0 28px 24px', maxWidth: 920, margin: '0 auto' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', color: '#555', textTransform: 'uppercase', marginBottom: 10, borderTop: '1px solid #141414', paddingTop: 18 }}>Recent broadcasts</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Date', 'Message', 'Recipients', 'Sent', 'Skipped', ''].map(h => (
                <th key={h} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: '#444', textTransform: 'uppercase', padding: '8px 8px 8px 0', textAlign: 'left', borderBottom: '1px solid #141414' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l._id} style={{ borderBottom: '1px solid #0d0d0d' }}>
                <td style={{ fontFamily: MONO, fontSize: 10, color: '#777', padding: '8px 8px 8px 0', whiteSpace: 'nowrap' }}>{new Date(l.sentAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ fontFamily: MONO, fontSize: 10, color: '#e8e8e8', padding: '8px 8px 8px 0', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.message}</td>
                <td style={{ fontFamily: MONO, fontSize: 10, color: '#FDC214', padding: '8px 8px 8px 0', textTransform: 'uppercase' }}>{l.recipientType === 'all' ? 'All' : `${l.recipients?.length ?? 0} selected`}</td>
                <td style={{ fontFamily: MONO, fontSize: 10, color: GREEN, padding: '8px 8px 8px 0' }}>{l.sent}</td>
                <td style={{ fontFamily: MONO, fontSize: 10, color: l.skipped ? RED : '#555', padding: '8px 8px 8px 0' }}>{l.skipped}</td>
                <td style={{ padding: '8px 8px 8px 0' }}>
                  <span onClick={() => deleteLog(l._id)} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: deletingId === l._id ? '#333' : '#666', textTransform: 'uppercase', cursor: deletingId === l._id ? 'default' : 'pointer' }}>
                    {deletingId === l._id ? '...' : 'Delete'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logsLoading && logs.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', padding: '16px 0' }}>No broadcasts sent yet.</div>
        )}
      </div>

      {/* Member picker modal */}
      {pickerOpen && (
        <MemberPickerModal
          members={members}
          selectedIds={selectedIds}
          onToggle={togglePick}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 400, background: '#0d0d0d', border: '1px solid #1e1e1e', padding: '24px 22px' }}>
            <div style={{ fontFamily: 'Boldstrom, sans-serif', fontSize: 16, color: '#fff', letterSpacing: '1px', marginBottom: 10 }}>Confirm broadcast</div>

            {mode === 'all' ? (
              <p style={{ fontFamily: MONO, fontSize: 12, color: '#aaa', lineHeight: 1.7, marginBottom: 20 }}>
                You are about to send an SMS to all <span style={{ color: GOLD }}>{members?.length ?? 0}</span> members.<br />This cannot be undone.
              </p>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: MONO, fontSize: 12, color: '#aaa', marginBottom: 8 }}>Sending to {selected.length} member{selected.length === 1 ? '' : 's'}:</p>
                <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                  {selected.map(m => (
                    <div key={m._id} style={{ fontFamily: MONO, fontSize: 11, color: GOLD, padding: '3px 0' }}>{blkId(m)} · @{m.username}</div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmOpen(false)} disabled={sending}
                style={{ flex: 1, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 0', background: 'none', border: '1px solid #2a2a2a', color: '#aaa', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={send} disabled={sending}
                style={{ flex: 1, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 0', background: GOLD, border: 'none', color: '#000', cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
                {sending ? 'Sending...' : 'Confirm and send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
