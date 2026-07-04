'use client'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, BarChart2, Users, UserCheck, ShieldCheck, Ban,
  FolderOpen, Pin, Send, Key, Settings, Terminal, LogOut, ChevronRight,
} from 'lucide-react'

const MONO  = 'IBM Plex Mono, monospace'
const SPACE = 'Space Grotesk, sans-serif'
const GOLD  = '#e8ff00'
const GREEN = '#00ff88'
const BLUE  = '#00aaff'
const RED   = '#ff4444'

function ago(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const NAV = [
  { section: 'Overview', items: [
    { label: 'Dashboard', Icon: LayoutDashboard, key: 'dashboard' },
    { label: 'Analytics', Icon: BarChart2,       key: 'analytics' },
  ]},
  { section: 'Members', items: [
    { label: 'All Members',  Icon: Users,       key: 'members'      },
    { label: 'Requests',     Icon: UserCheck,   key: 'requests',    badgeKey: 'pendingApplications', badgeColor: GOLD },
    { label: 'Verification', Icon: ShieldCheck, key: 'verification', badgeKey: 'pendingVerification', badgeColor: BLUE },
    { label: 'Flagged',      Icon: Ban,         key: 'flagged'      },
  ]},
  { section: 'Content', items: [
    { label: 'Projects', Icon: FolderOpen, key: 'projects' },
    { label: 'Bulletin', Icon: Pin,        key: 'bulletin' },
    { label: 'Pitches',  Icon: Send,       key: 'pitches',  badgeKey: 'pendingPitches', badgeColor: GREEN },
  ]},
  { section: 'System', items: [
    { label: 'Config', Icon: Settings, key: 'config' },
    { label: 'Logs',   Icon: Terminal, key: 'logs'   },
  ]},
]

function Sidebar({ active, setActive, badges }) {
  return (
    <div style={{ width: 180, flexShrink: 0, background: '#080808', borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {NAV.map(({ section, items }) => (
        <div key={section} style={{ padding: '10px 0 4px' }}>
          <div style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.25em', color: '#2a2a2a', textTransform: 'uppercase', padding: '0 12px 6px' }}>{section}</div>
          {items.map(({ label, Icon, key, badgeKey, badgeColor }) => {
            const isActive = active === key
            const badge = badgeKey ? badges[badgeKey] : null
            return (
              <button key={key} onClick={() => setActive(key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', background: isActive ? '#0d0d0d' : 'transparent', borderLeft: isActive ? `2px solid ${GOLD}` : '2px solid transparent', border: 'none', textAlign: 'left' }}>
                <Icon size={14} style={{ color: isActive ? GOLD : '#333', flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.08em', color: isActive ? GOLD : '#444', textTransform: 'uppercase', flex: 1 }}>{label}</span>
                {badge ? <span style={{ fontFamily: MONO, fontSize: 7, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', background: `${badgeColor}15`, color: badgeColor }}>{badge}</span> : null}
              </button>
            )
          })}
          <div style={{ height: 1, background: '#0f0f0f', margin: '4px 0' }} />
        </div>
      ))}
      <div style={{ marginTop: 'auto', padding: 12 }}>
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
          <LogOut size={12} style={{ color: '#333' }} />
          <span style={{ fontFamily: MONO, fontSize: 7, color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sign out</span>
        </button>
      </div>
    </div>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, delta, deltaUp, color }) {
  return (
    <div style={{ background: '#0a0a0a', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.4 }} />
      <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.15em', color: '#333', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1, marginBottom: 3 }}>{value ?? '—'}</div>
      <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.08em', color: deltaUp ? GREEN : RED }}>{delta}</div>
    </div>
  )
}

// ─── Analytics bar ────────────────────────────────────────────────────────────
const BAR_COLORS = [BLUE, GREEN, RED, '#ff8833', GOLD, '#aa88ff', '#ff44aa']

function AnalyticsBar({ label, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, color: '#555', width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 4, background: '#141414', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: color }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 8, color, width: 36, textAlign: 'right', flexShrink: 0 }}>{pct}%</div>
    </div>
  )
}

// ─── Dashboard view ──────────────────────────────────────────────────────────
function DashboardView({ stats, members, pitches, analytics }) {
  return (
    <div>
      {/* Page header */}
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 4 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: '#2a2a2a', textTransform: 'uppercase', marginBottom: 3 }}>Blkuzz HQ · Command centre</div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>Dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.12em', padding: '5px 10px', border: '1px solid #1e1e1e', color: '#555', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>Export</button>
          <button style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.12em', padding: '5px 10px', border: `1px solid ${GOLD}40`, color: GOLD, background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>+ Announce</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#141414', borderBottom: '1px solid #141414' }}>
        <KpiCard label="Total members"   value={stats?.totalMembers}   delta={`↑ +${stats?.newThisMonth ?? 0} this month`}  deltaUp color={GREEN} />
        <KpiCard label="Active (30 days)" value={stats?.activeToday}   delta="Recent signups"                                deltaUp color={GOLD}  />
        <KpiCard label="Live projects"   value={stats?.liveProjects}   delta="Across all members"                            deltaUp color={BLUE}  />
        <KpiCard label="Pending actions" value={stats?.pendingActions} delta={stats?.pendingActions > 0 ? '↓ needs attention' : '✓ all clear'} deltaUp={!stats?.pendingActions} color={RED} />
      </div>

      {/* Member requests */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #0f0f0f' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: '#333', textTransform: 'uppercase' }}>Member roster</div>
          <span style={{ fontFamily: MONO, fontSize: 7, color: '#2a2a2a', cursor: 'pointer', textTransform: 'uppercase' }}>View all →</span>
        </div>
        {(members ?? []).slice(0, 5).map(m => (
          <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #0d0d0d' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8, fontWeight: 700, background: '#0d0d0d', border: '1px solid #1e1e1e', color: '#555', flexShrink: 0 }}>
              {(m.username?.[0] ?? m.name?.[0] ?? '?').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e8e8e8', letterSpacing: '-0.01em' }}>{m.name || m.username}</div>
              <div style={{ fontFamily: MONO, fontSize: 7, color: '#333', marginTop: 1 }}>@{m.username} · {m.discipline ?? '—'} · {m.createdAt ? ago(m.createdAt) : '—'}</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.1em', padding: '1px 6px', border: '1px solid #1e1e1e', color: '#444', textTransform: 'uppercase', flexShrink: 0 }}>{m.discipline ?? '—'}</div>
            <span style={{ fontFamily: MONO, fontSize: 7, color: '#333', cursor: 'pointer', flexShrink: 0 }}>Manage →</span>
          </div>
        ))}
        {(!members || members.length === 0) && (
          <div style={{ fontFamily: MONO, fontSize: 8, color: '#2a2a2a', padding: '12px 0' }}>No members found.</div>
        )}
      </div>

      {/* Pitches */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #0f0f0f' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: '#333', textTransform: 'uppercase' }}>Work with us — pitches</div>
          <span style={{ fontFamily: MONO, fontSize: 7, color: '#2a2a2a', textTransform: 'uppercase' }}>View all →</span>
        </div>
        {(pitches ?? []).slice(0, 4).map(p => (
          <div key={p._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid #0d0d0d', cursor: 'pointer' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: p.status === 'pending' ? GOLD : p.status === 'accepted' ? GREEN : '#555' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ccc', letterSpacing: '-0.01em', marginBottom: 2 }}>{p.projectTitle}</div>
              <div style={{ fontFamily: MONO, fontSize: 7, color: '#333', display: 'flex', gap: 8 }}>
                <span>@{p.creator?.username ?? '—'}</span>
                <span>{p.creator?.discipline ?? '—'}</span>
                <span style={{ color: p.status === 'pending' ? GOLD : p.status === 'accepted' ? GREEN : '#555', textTransform: 'uppercase' }}>{p.status}</span>
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 7, color: '#2a2a2a', whiteSpace: 'nowrap', flexShrink: 0 }}>{p.submittedAt ? ago(p.submittedAt) : '—'}</div>
          </div>
        ))}
        {(!pitches || pitches.length === 0) && (
          <div style={{ fontFamily: MONO, fontSize: 8, color: '#2a2a2a', padding: '12px 0' }}>No pitches yet.</div>
        )}
      </div>

      {/* Analytics */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #0f0f0f' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: '#333', textTransform: 'uppercase' }}>Activity by discipline</div>
          <span style={{ fontFamily: MONO, fontSize: 7, color: '#2a2a2a', textTransform: 'uppercase' }}>Full report →</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(analytics?.byDiscipline ?? []).slice(0, 6).map((d, i) => (
            <AnalyticsBar key={d.label} label={d.label} pct={d.pct} color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
          {(!analytics?.byDiscipline?.length) && (
            <div style={{ fontFamily: MONO, fontSize: 8, color: '#2a2a2a' }}>No data yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Members view ─────────────────────────────────────────────────────────────
function MembersView({ members }) {
  return (
    <div>
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #141414', background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 4 }}>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: '#2a2a2a', marginBottom: 3 }}>Blkuzz HQ · Members</div>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>All Members</div>
      </div>
      <div style={{ padding: '0 18px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Member', 'Discipline', 'Location', 'Joined', 'Projects'].map(h => (
                <th key={h} style={{ fontFamily: MONO, fontSize: 6, letterSpacing: '0.2em', color: '#2a2a2a', textTransform: 'uppercase', padding: '8px 0', textAlign: 'left', borderBottom: '1px solid #141414' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map(m => (
              <tr key={m._id} style={{ borderBottom: '1px solid #0d0d0d' }}>
                <td style={{ padding: '8px 0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ccc' }}>{m.name || m.username}</div>
                  <div style={{ fontFamily: MONO, fontSize: 7, color: '#2a2a2a' }}>@{m.username}</div>
                </td>
                <td style={{ fontFamily: MONO, fontSize: 8, color: '#888', padding: '8px 0' }}>{m.discipline ?? '—'}</td>
                <td style={{ fontFamily: MONO, fontSize: 8, color: '#888', padding: '8px 0' }}>{m.location ?? '—'}</td>
                <td style={{ fontFamily: MONO, fontSize: 8, color: '#888', padding: '8px 0' }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : '—'}</td>
                <td style={{ fontFamily: MONO, fontSize: 8, color: '#888', padding: '8px 0' }}>{m.projectCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!members || members.length === 0) && (
          <div style={{ fontFamily: MONO, fontSize: 8, color: '#2a2a2a', padding: '20px 0' }}>No members found.</div>
        )}
      </div>
    </div>
  )
}

// ─── Pitches view ─────────────────────────────────────────────────────────────
function PitchesView({ pitches, onUpdate }) {
  const [updating, setUpdating] = useState(null)

  async function respond(id, status) {
    setUpdating(id)
    await fetch('/bz-admin/api/pitches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    onUpdate()
    setUpdating(null)
  }

  return (
    <div>
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #141414', background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 4 }}>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: '#2a2a2a', marginBottom: 3 }}>Blkuzz HQ · Content</div>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff' }}>Pitches</div>
      </div>
      <div style={{ padding: '0 18px' }}>
        {(pitches ?? []).map(p => (
          <div key={p._id} style={{ padding: '14px 0', borderBottom: '1px solid #0d0d0d' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e8e8e8', marginBottom: 3 }}>{p.projectTitle}</div>
                <div style={{ fontFamily: MONO, fontSize: 7, color: '#444' }}>@{p.creator?.username ?? '—'} · {p.creator?.discipline ?? '—'} · {p.submittedAt ? ago(p.submittedAt) : '—'}</div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 7, padding: '2px 7px', border: `1px solid ${p.status === 'pending' ? GOLD + '40' : p.status === 'accepted' ? GREEN + '40' : '#1e1e1e'}`, color: p.status === 'pending' ? GOLD : p.status === 'accepted' ? GREEN : '#555', textTransform: 'uppercase' }}>{p.status}</span>
            </div>
            <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6, marginBottom: 8 }}>{p.pitch?.slice(0, 200)}{p.pitch?.length > 200 ? '…' : ''}</p>
            {p.status === 'pending' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => respond(p._id, 'accepted')} disabled={updating === p._id} style={{ fontFamily: MONO, fontSize: 7, padding: '4px 10px', border: `1px solid ${GREEN}40`, color: GREEN, background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>Accept</button>
                <button onClick={() => respond(p._id, 'declined')} disabled={updating === p._id} style={{ fontFamily: MONO, fontSize: 7, padding: '4px 10px', border: `1px solid ${RED}40`, color: RED, background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>Decline</button>
                <button onClick={() => respond(p._id, 'reviewed')} disabled={updating === p._id} style={{ fontFamily: MONO, fontSize: 7, padding: '4px 10px', border: '1px solid #1e1e1e', color: '#555', background: 'transparent', cursor: 'pointer', textTransform: 'uppercase' }}>Mark reviewed</button>
              </div>
            )}
          </div>
        ))}
        {(!pitches || pitches.length === 0) && (
          <div style={{ fontFamily: MONO, fontSize: 8, color: '#2a2a2a', padding: '20px 0' }}>No pitches yet.</div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [active, setActive]     = useState('dashboard')
  const [clock, setClock]       = useState('')
  const [stats, setStats]       = useState(null)
  const [members, setMembers]   = useState([])
  const [pitches, setPitches]   = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      const pad = v => String(v).padStart(2, '0')
      setClock(`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [s, m, p, a] = await Promise.all([
      fetch('/bz-admin/api/stats').then(r => r.json()).catch(() => null),
      fetch('/bz-admin/api/members').then(r => r.json()).catch(() => []),
      fetch('/bz-admin/api/pitches').then(r => r.json()).catch(() => []),
      fetch('/bz-admin/api/analytics').then(r => r.json()).catch(() => null),
    ])
    setStats(s)
    setMembers(Array.isArray(m) ? m : [])
    setPitches(Array.isArray(p) ? p : [])
    setAnalytics(a)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const badges = {
    pendingPitches:      pitches.filter(p => p.status === 'pending').length || null,
    pendingApplications: null,
  }

  const renderMain = () => {
    if (loading) return <div style={{ padding: 24, fontFamily: MONO, fontSize: 8, color: '#333' }}>Loading...</div>
    if (active === 'dashboard') return <DashboardView stats={stats} members={members} pitches={pitches} analytics={analytics} />
    if (active === 'members')   return <MembersView members={members} />
    if (active === 'pitches')   return <PitchesView pitches={pitches} onUpdate={loadData} />
    if (active === 'analytics') return (
      <div style={{ padding: 18 }}>
        <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: '#2a2a2a', marginBottom: 3 }}>Blkuzz HQ · Analytics</div>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff', marginBottom: 20 }}>Analytics</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(analytics?.byDiscipline ?? []).map((d, i) => (
            <AnalyticsBar key={d.label} label={d.label} pct={d.pct} color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </div>
      </div>
    )
    return <div style={{ padding: 24, fontFamily: MONO, fontSize: 8, color: '#333', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Coming soon — {active}</div>
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#080808', color: '#e8e8e8', overflow: 'hidden' }}>

      {/* Command bar */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13, letterSpacing: '0.2em', color: '#fff' }}>BLKUZZ</span>
          <span style={{ color: '#2a2a2a', fontFamily: MONO, fontSize: 13 }}>/</span>
          <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', color: RED, border: `1px solid ${RED}30`, padding: '2px 7px', textTransform: 'uppercase' }}>Command</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 8, color: GREEN, letterSpacing: '0.1em' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, animation: 'pulse 2s infinite' }} />
            Systems nominal
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: '#2a2a2a', letterSpacing: '0.1em' }}>{clock}</div>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a1700', border: `1px solid ${GOLD}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 7, color: GOLD, fontWeight: 700 }}>BZ</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar active={active} setActive={setActive} badges={badges} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderMain()}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}
