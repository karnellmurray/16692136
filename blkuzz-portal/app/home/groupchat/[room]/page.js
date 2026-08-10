'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import { Send, AtSign, FolderOpen, X } from 'lucide-react'

// Groupchat isn't ready for release yet — gate the whole area behind a
// locked placeholder instead of the real chat UI. Flip to false to restore.
const GROUPCHAT_LOCKED = true

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function initials(username) {
  if (!username) return '?'
  return username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()
}

const USER_COLORS = ['#e8ff00', '#00ff88', '#00aaff', '#ff8833', '#aa88ff', '#FDC214', '#00ccff', '#ff6688']
function userColor(username) {
  if (!username) return '#555'
  let h = 0
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0
  return USER_COLORS[h % USER_COLORS.length]
}

const ROOM_COLORS = ['#ff8833', '#D2042D', '#00ff88', '#00aaff', '#aa88ff', '#FDC214', '#00ccff', '#ff6688', '#e8ff00', '#ff4499']
const ROOM_EMOJIS = ['🎨', '🎵', '🎬', '📷', '🏗', '✦', '🧵', '💡', '🌐', '⬡']

function tagHash(str) {
  if (!str) return 0
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

function tagColor(tag) { return ROOM_COLORS[tagHash(tag) % ROOM_COLORS.length] }
function tagEmoji(tag) { return ROOM_EMOJIS[tagHash(tag) % ROOM_EMOJIS.length] }
function tagBg(color) {
  const hex = color.replace('#', '')
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
  return `rgba(${r},${g},${b},0.06)`
}

function slugify(tag) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function pluralize(tag) {
  if (tag.toLowerCase().endsWith('s')) return tag
  return tag + 's'
}

const ROOM_ICONS = {
  'lobby':              'armchair.png',
  '3d-artist':          'dimensions.png',
  'a-r':                'conversation.png',
  'actor':              'drama.png',
  'animator':           'slow-motion.png',
  'art-director':       'chair.png',
  'artist':             'paint-palette.png',
  'assistant-director': 'chair.png',
  'cgi-artist':         'laptop-computer.png',
  'camera-operator':    'video-camera.png',
  'character-artist':   'pencil.png',
  'comic-artist':       'pencil.png',
  'choreographer':      'music-player.png',
  'content-creator':    'iphone.png',
  'creative-director':  'chair.png',
  'dj':                 'music-player.png',
  'dop':                'video-camera.png',
  'dance':              'music-player.png',
  'digital-artist':     'laptop-computer.png',
  'dancer':             'music-player.png',
  'director':           'chair.png',
  'filmmaker':          'video-camera.png',
  'fine-artist':        'paint-palette.png',
  'graphic-designer':   'laptop-computer.png',
  'guitarist':          'classic-acoustic-guitar.png',
  'hair-stylist':       'scissors.png',
  'illustrator':        'pencil.png',
  'makeup-artist':      'brush.png',
  'music-manager':      'conversation.png',
  'music-producer':     'music-player.png',
  'musician':           'music-player.png',
  'performer':          'drama.png',
  'photographer':       'camera.png',
  'pianist':            'piano.png',
  'podcaster':          'mic.png',
  'producer':           'chair.png',
  'production-designer': 'chair.png',
  'promoter':           'megaphone.png',
  'public-speaker':     'megaphone.png',
  'rapper':             'microphone.png',
  'singer':             'microphone.png',
  'songwriter':         'music-player.png',
  'sound-designer':     'music-player.png',
  'topliner':           'music-player.png',
  'ux-ui-designer':     'laptop-computer.png',
  'web-designer':       'laptop-computer.png',
  'writer':             'pencil.png',
  'social-media-marketer': 'iphone.png',
  'sculptor':           'hammer-tool.png',
  'stylist':            'clothes-hanger.png',
  'textile-artist':     'clothes-hanger.png',
}

const ICON_FILTER = 'brightness(0) saturate(100%) invert(74%) sepia(100%) saturate(900%) hue-rotate(4deg) brightness(102%)'
const FLIPPED_ICONS = new Set(['hair-stylist'])
const ICON_SIZES = { 'makeup-artist': 22, 'podcaster': 22, 'promoter': 22, 'public-speaker': 22, 'rapper': 22, 'singer': 22, 'animator': 22 }

const LOBBY_ROOM = { id: 'lobby', rawTag: 'lobby', label: 'LOBBY', emoji: '🏛', icon: 'armchair.png', color: '#e8ff00', bg: 'rgba(232,255,0,0.06)' }

function buildRooms(tags) {
  return [LOBBY_ROOM, ...tags.map(tag => {
    const color = tagColor(tag)
    const id    = slugify(tag)
    return { id, rawTag: tag, label: pluralize(tag).toUpperCase(), emoji: tagEmoji(tag), icon: ROOM_ICONS[id] || null, color, bg: tagBg(color) }
  })]
}

const READS_KEY = 'gc_reads'

function getReads() {
  try { return JSON.parse(localStorage.getItem(READS_KEY) || '{}') } catch { return {} }
}

function setRead(room, lastId) {
  const reads = getReads()
  reads[room] = lastId
  localStorage.setItem(READS_KEY, JSON.stringify(reads))
}

function UserAvatar({ sender, size = 26 }) {
  const url   = sender?.avatarUrl || null
  const color = userColor(sender?.username)
  const [imgOk, setImgOk] = useState(null) // null=pending, true=loaded, false=failed
  useEffect(() => { setImgOk(url ? null : false) }, [url])
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', fontFamily: 'IBM Plex Mono, monospace', fontSize: size * 0.27, fontWeight: 700, color: `${color}90` }}>
      {imgOk === false && initials(sender?.username)}
      {url && <img src={url} alt="" onLoad={() => setImgOk(true)} onError={() => setImgOk(false)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: imgOk === true ? 1 : 0 }} />}
    </div>
  )
}

function ProjectCard({ project, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#0f0f0f', border: '1px solid #FDC21440', marginBottom: 6, position: 'relative' }}>
      {project.coverImage && (
        <img src={project.coverImage} alt="" style={{ width: 30, height: 30, objectFit: 'cover', flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#FDC214', letterSpacing: '0.1em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.title}</div>
        {project.discipline && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#444', letterSpacing: '0.08em' }}>{project.discipline}</div>}
      </div>
      <button onClick={onRemove} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#555', marginLeft: 'auto', flexShrink: 0, lineHeight: 0 }}>
        <X size={10} />
      </button>
    </div>
  )
}

function MentionTypeahead({ query, users, onSelect, onDismiss }) {
  const filtered = users.filter(u => u.username?.toLowerCase().startsWith(query.toLowerCase())).slice(0, 6)
  if (!filtered.length) return null
  return (
    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#0f0f0f', border: '1px solid #1a1a1a', borderBottom: 'none', zIndex: 100, maxHeight: 160, overflowY: 'auto' }}>
      {filtered.map(u => (
        <div key={u._id} onMouseDown={e => { e.preventDefault(); onSelect(u.username) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #111' }}>
          <UserAvatar sender={u} size={20} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#FDC214', letterSpacing: '0.08em' }}>@{u.username}</span>
          {u.discipline && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#333', letterSpacing: '0.05em' }}>{u.discipline}</span>}
        </div>
      ))}
    </div>
  )
}

let socket

export default function GroupChatRoomPage() {
  if (!GROUPCHAT_LOCKED) return <GroupChatRoomPageInner />

  return (
    <>
      {/* Real UI, blurred — locked=true skips all data fetching and the socket connection */}
      <div style={{ position: 'fixed', inset: 0, filter: 'blur(10px)', pointerEvents: 'none' }}>
        <GroupChatRoomPageInner locked />
      </div>

      {/* Scrim */}
      <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, background: 'rgba(10,10,10,0.55)' }} />

      {/* Lock overlay */}
      <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, background: '#FDC214',
          WebkitMaskImage: 'url(/portal/icons/lock.png)', maskImage: 'url(/portal/icons/lock.png)',
          WebkitMaskSize: 'contain', maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center', maskPosition: 'center',
        }} />
        <p className="font-head" style={{ fontSize: 14, letterSpacing: '3px', color: '#FDC214', textTransform: 'uppercase' }}>Restricted Area</p>
      </div>
    </>
  )
}

function GroupChatRoomPageInner({ locked = false }) {
  const router   = useRouter()
  const params   = useParams()
  const { data: session } = useSession()

  const [rooms, setRooms] = useState([LOBBY_ROOM])

  const rawParam    = params?.room ? decodeURIComponent(String(params.room)) : 'lobby'
  const activeRoomId = slugify(rawParam) || 'lobby'
  const room = rooms.find(r => r.id === activeRoomId) || LOBBY_ROOM

  const [messages, setMessages]         = useState([])
  const [roomMembers, setRoomMembers]   = useState([])
  const [allUsers, setAllUsers]         = useState([])
  const [text, setText]                 = useState('')
  const [sending, setSending]           = useState(false)
  const [connected, setConnected]       = useState(false)
  const [unread, setUnread]             = useState({})
  const [showProjects, setShowProjects] = useState(false)
  const [myProjects, setMyProjects]     = useState([])
  const [attachedProject, setAttachedProject] = useState(null)
  const [mentionQuery, setMentionQuery] = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const loadMessages = (rid) => {
    apiFetch(`/api/groupchat?room=${rid}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setMessages(data)
        if (data.length) setRead(rid, data[data.length - 1]._id?.toString())
      }
    })
  }

  const loadRoomMembers = (rawTag) => {
    apiFetch(`/api/groupchat/members?tag=${encodeURIComponent(rawTag)}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setRoomMembers(data)
    }).catch(() => {})
  }

  useEffect(() => {
    if (locked) return

    // Build rooms from all distinct tags in the database
    apiFetch('/api/tags').then(r => r.json()).then(tags => {
      if (Array.isArray(tags)) setRooms(buildRooms(tags))
    }).catch(() => {})

    // All users for @ mention
    apiFetch('/api/directory').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAllUsers(data)
    }).catch(() => {})

    // Socket.io is attached to this app's own HTTP server (see server.js),
    // so it always lives at the current origin — hardcoding a host here
    // broke as soon as the app ran on any port other than 3001.
    socket = io()
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('group-message', msg => {
      if (msg.room === activeRoomId || (activeRoomId === 'lobby' && !msg.room)) {
        setMessages(prev => prev.some(m => m._id?.toString() === msg._id?.toString()) ? prev : [...prev, msg])
        setRead(activeRoomId, msg._id?.toString())
      } else {
        // Mark other room as unread
        setUnread(prev => ({ ...prev, [msg.room]: (prev[msg.room] || 0) + 1 }))
      }
    })
    return () => { socket?.disconnect() }
  }, [locked])

  useEffect(() => {
    if (locked) return
    loadMessages(activeRoomId)
    setUnread(prev => { const n = { ...prev }; delete n[activeRoomId]; return n })
  }, [activeRoomId, locked])

  // Re-runs when rooms load (rawTag changes from 'lobby' fallback to real value)
  useEffect(() => {
    if (locked) return
    if (!room.rawTag || (room.rawTag === 'lobby' && activeRoomId !== 'lobby')) return
    loadRoomMembers(room.rawTag)
  }, [room.rawTag, activeRoomId, locked])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMyProjects = () => {
    if (!session?.user?.id) return
    apiFetch(`/api/projects?userId=${session.user.id}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setMyProjects(data)
    }).catch(() => {})
  }

  const handleTextChange = (e) => {
    const val = e.target.value
    setText(val)
    // @ mention detection — find last @ followed by non-space chars at cursor
    const cursor = e.target.selectionStart
    const before = val.slice(0, cursor)
    const match  = before.match(/@(\w*)$/)
    setMentionQuery(match ? match[1] : null)
  }

  const handleMentionSelect = (username) => {
    const cursor = inputRef.current?.selectionStart || text.length
    const before = text.slice(0, cursor)
    const after  = text.slice(cursor)
    const replaced = before.replace(/@\w*$/, `@${username} `)
    setText(replaced + after)
    setMentionQuery(null)
    inputRef.current?.focus()
  }

  const send = async e => {
    e.preventDefault()
    if (!text.trim() && !attachedProject) return
    setSending(true)
    const body = { content: text.trim() || (attachedProject ? `Dropped a project: ${attachedProject.title}` : ''), room: activeRoomId }
    if (attachedProject) body.projectRef = attachedProject._id
    await apiFetch('/api/groupchat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setText('')
    setAttachedProject(null)
    setMentionQuery(null)
    setSending(false)
  }

  const me = session?.user?.id

  return (
    <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#e8e8e8', overflow: 'hidden', fontFamily: 'Space Grotesk, sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <span className="font-head" style={{ fontSize: 15, letterSpacing: '2px', color: '#FDC214' }}>BLKUZZ</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: '#008000' }}>
          <span className="animate-pulse2" style={{ width: 5, height: 5, background: '#008000', borderRadius: '50%', display: 'inline-block' }} />
          {connected ? 'LIVE' : 'CONNECTING...'}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Floor selector */}
        <div style={{ width: 72, borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column', background: '#080808', flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 6, letterSpacing: '0.2em', color: '#555', textTransform: 'uppercase', textAlign: 'center', padding: '8px 4px 6px', borderBottom: '1px solid #141414', flexShrink: 0 }}>
            Rooms
          </div>
          {rooms.map(r => {
            const isActive = activeRoomId === r.id
            const roomUnread = unread[r.id] || 0
            return (
              <div key={r.id} onClick={() => router.push(`/home/groupchat/${r.id}`)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #0f0f0f', cursor: 'pointer', position: 'relative', gap: 4, background: isActive ? '#0d0d0d' : 'transparent', borderLeft: isActive ? `2px solid ${r.color}` : '2px solid transparent', transition: 'background 0.1s' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: r.color }}>
                    {r.icon
                      ? <img src={`/portal/icons/groupchat/${r.icon}`} alt="" style={{ width: ICON_SIZES[r.id] ?? 18, height: ICON_SIZES[r.id] ?? 18, objectFit: 'contain', filter: ICON_FILTER, transform: FLIPPED_ICONS.has(r.id) ? 'scaleX(-1)' : 'none' }} />
                      : r.emoji
                    }
                  </div>
                  {roomUnread > 0 && (
                    <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#D2042D', border: '1px solid #080808' }} />
                  )}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 6, letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.3, color: isActive ? r.color : '#888' }}>
                  {r.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Main chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Room header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #141414', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${room.color}10, transparent)`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, position: 'relative' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.15em', padding: '3px 9px', fontWeight: 700, textTransform: 'uppercase', background: `${room.color}15`, color: room.color, border: `1px solid ${room.color}30`, borderRadius: 9999 }}>
                {room.label}
              </span>
              <span className="font-head" style={{ fontSize: 14, letterSpacing: '2px', color: '#fff' }}>
                {room.id === 'lobby' ? 'All Members' : room.label.charAt(0) + room.label.slice(1).toLowerCase()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 14, position: 'relative' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#555', letterSpacing: '0.08em' }}>
                {roomMembers.length} {activeRoomId === 'lobby' ? (roomMembers.length === 1 ? 'member' : 'members') : (roomMembers.length === 1 ? room.rawTag.toLowerCase() : room.label.toLowerCase())}
              </span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? '#008000' : '#333', display: 'inline-block', boxShadow: connected ? '0 0 6px 2px rgba(0,128,0,0.6)' : 'none' }} />
                <span style={{ color: '#555' }}>{connected ? 'live' : 'offline'}</span>
              </span>
            </div>
          </div>

          {/* Members strip */}
          {roomMembers.length > 0 && (
            <div style={{ display: 'flex', gap: 3, padding: '6px 14px', borderBottom: '1px solid #0f0f0f', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0, alignItems: 'center' }}>
              {roomMembers.slice(0, 12).map(s => (
                <div key={s._id} title={`@${s.username}`}>
                  <UserAvatar sender={s} size={22} />
                </div>
              ))}
              {roomMembers.length > 12 && (
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#333', letterSpacing: '0.08em', marginLeft: 4, whiteSpace: 'nowrap' }}>
                  +{roomMembers.length - 12}
                </span>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2, scrollbarWidth: 'none' }}>
            {messages.map((msg, i) => {
              if (msg.msgType === 'system') {
                return (
                  <div key={msg._id || i} style={{ textAlign: 'center', padding: '6px 0', fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#2a2a2a', letterSpacing: '0.1em' }}>
                    — {msg.content} —
                  </div>
                )
              }
              const isMine = msg.sender?._id?.toString() === me || msg.sender?.toString() === me
              const color  = isMine ? '#FDC214' : userColor(msg.sender?.username)
              const prevMsg = messages[i - 1]
              const sameSender = prevMsg?.msgType !== 'system' && prevMsg?.sender?._id?.toString() === msg.sender?._id?.toString()
              return (
                <div key={msg._id || i} style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
                  <div style={{ width: 26, flexShrink: 0, marginTop: 1 }}>
                    {!sameSender && <UserAvatar sender={msg.sender} size={26} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {!sameSender && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
                        <span className="font-head" style={{ fontSize: 11, color, letterSpacing: '2px' }}>
                          {msg.sender?.name || msg.sender?.username || 'Unknown'}
                        </span>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#2a2a2a', letterSpacing: '0.05em' }}>
                          @{msg.sender?.username}
                        </span>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#2a2a2a', marginLeft: 'auto' }}>
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    {msg.projectRef && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', background: '#0f0f0f', border: '1px solid #FDC21430', marginBottom: 4, maxWidth: 220 }}>
                        {msg.projectRef.coverImage && <img src={msg.projectRef.coverImage} alt="" style={{ width: 26, height: 26, objectFit: 'cover', flexShrink: 0 }} />}
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#FDC214', letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.projectRef.title}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>{msg.content}</div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div style={{ borderTop: '1px solid #141414', padding: '10px 14px', flexShrink: 0, background: '#0a0a0a', position: 'relative' }}>

            {/* Project picker dropdown */}
            {showProjects && (
              <div style={{ position: 'absolute', bottom: '100%', left: 14, right: 14, background: '#0f0f0f', border: '1px solid #1a1a1a', borderBottom: 'none', maxHeight: 200, overflowY: 'auto', zIndex: 100 }}>
                <div style={{ padding: '6px 10px', borderBottom: '1px solid #141414', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#555', letterSpacing: '0.1em' }}>YOUR PROJECTS</span>
                  <button onClick={() => setShowProjects(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#555', lineHeight: 0, padding: 0 }}><X size={10} /></button>
                </div>
                {myProjects.length === 0 && (
                  <div style={{ padding: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#333' }}>No projects found.</div>
                )}
                {myProjects.map(p => (
                  <div key={p._id} onClick={() => { setAttachedProject(p); setShowProjects(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid #111' }}>
                    {p.coverImage && <img src={p.coverImage} alt="" style={{ width: 24, height: 24, objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#ccc', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                  </div>
                ))}
              </div>
            )}

            {attachedProject && (
              <ProjectCard project={attachedProject} onRemove={() => setAttachedProject(null)} />
            )}

            <form onSubmit={send} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <AtSign size={16} style={{ color: '#FDC214', cursor: 'pointer' }}
                  onClick={() => { setText(prev => prev + '@'); inputRef.current?.focus() }} />
                <FolderOpen size={16} style={{ color: '#FDC214', cursor: 'pointer' }}
                  onClick={() => { loadMyProjects(); setShowProjects(v => !v) }} />
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                {mentionQuery !== null && (
                  <MentionTypeahead
                    query={mentionQuery}
                    users={allUsers}
                    onSelect={handleMentionSelect}
                    onDismiss={() => setMentionQuery(null)}
                  />
                )}
                <input
                  ref={inputRef}
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Say something to the room..."
                  className="placeholder-white"
                  style={{ width: '100%', background: '#111', border: '1px solid #FDC214', color: '#e8e8e8', fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, padding: '8px 12px', outline: 'none', borderRadius: 9999, boxSizing: 'border-box' }}
                />
              </div>
              <button type="submit" disabled={sending || (!text.trim() && !attachedProject)} style={{ background: 'transparent', border: 'none', padding: '7px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Send size={15} style={{ color: '#FDC214' }} />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
