'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import { Send, Lock, Paperclip, FolderOpen, MoreVertical, User, ArrowLeft } from 'lucide-react'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  if (s < 2629800) return `${Math.floor(s / 604800)}w`
  if (s < 31557600) return `${Math.floor(s / 2629800)}mo`
  return `${Math.floor(s / 31557600)}y`
}

function initials(username) {
  if (!username) return '?'
  return username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()
}

const isVideo = url => /\.(mp4|mov|webm|ogg|avi|m4v|mkv|3gp)(\?|$)/i.test(url)

function Avatar({ user, size = 36, style = {} }) {
  const url = user?.avatarUrl || user?.avatar?.url || user?.profileImage || null
  const [imgError, setImgError] = useState(false)
  useEffect(() => { setImgError(false) }, [url])
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', fontFamily: 'IBM Plex Mono, monospace', fontSize: size * 0.28, fontWeight: 700, color: '#00ff8870', ...style }}>
      {(!url || imgError) && initials(user?.username)}
      {url && !imgError && <img src={url} alt="" onError={() => setImgError(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />}
    </div>
  )
}

let socket

function InboxPageContent() {
  const { data: session }   = useSession()
  const searchParams        = useSearchParams()
  const router              = useRouter()
  const withUserId          = searchParams.get('with')

  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId]           = useState(withUserId || null)
  const [activeUser, setActiveUser]       = useState(null)
  const [pageLoading, setPageLoading]     = useState(true)
  const [messages, setMessages]           = useState([])
  const [text, setText]                   = useState('')
  const [sending, setSending]             = useState(false)
  const [search, setSearch]               = useState('')
  const [tab, setTab]                     = useState('messages')
  const [requests, setRequests]           = useState([])
  const [menuOpen, setMenuOpen]           = useState(false)
  const [confirmModal, setConfirmModal]   = useState(null) // 'block' | 'block-report'
  const [mediaUrls, setMediaUrls]         = useState([])
  const [uploading, setUploading]         = useState(false)
  const [lightbox, setLightbox]           = useState(null)
  const menuRef                           = useRef(null)
  const bottomRef                         = useRef(null)
  const fileInputRef                      = useRef(null)

  // Connect Socket.io
  useEffect(() => {
    if (!session?.user?.id) return
    // Socket.io is attached to this app's own HTTP server (see server.js),
    // so it always lives at the current origin — hardcoding a host here
    // broke as soon as the app ran on any port other than 3001.
    socket = io()
    socket.emit('join', session.user.id)
    socket.on('direct-message', msg => {
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg])
    })
    socket.on('conversation:hidden', ({ userId }) => {
      setConversations(prev => prev.filter(c => c._id !== userId))
      if (activeId === userId) { setActiveId(null); setActiveUser(null); setMessages([]) }
    })
    return () => { socket?.disconnect() }
  }, [session?.user?.id])

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const executeBlock = async (withReport) => {
    setConfirmModal(null)
    await apiFetch('/api/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeId, report: withReport }),
    })
    setConversations(prev => prev.filter(c => c._id !== activeId))
    setActiveId(null)
    setActiveUser(null)
    setMessages([])
  }

  const loadConversations = (markReady = false) => {
    apiFetch('/api/messages').then(r => r.json()).then(data => {
      setConversations(Array.isArray(data) ? data : [])
      if (markReady) setPageLoading(false)
    })
  }

  const loadRequests = () => {
    apiFetch('/api/notifications').then(r => r.json()).then(data => {
      const pending = (data.notifications ?? []).filter(
        n => n.type === 'collab_request' && n.status === 'pending'
      )
      setRequests(pending)
    })
  }

  useEffect(() => { loadConversations(!withUserId); loadRequests() }, [])

  useEffect(() => {
    if (withUserId) openConversation(withUserId, null)
  }, [withUserId])

  const openConversation = (userId, user) => {
    setActiveId(userId)
    if (user) setActiveUser(user)
    apiFetch(`/api/messages/${userId}`).then(r => r.json()).then(data => {
      setMessages(Array.isArray(data) ? data : [])
      loadConversations()
      // resolve user from conversations if not passed
      if (!user) {
        apiFetch('/api/messages').then(r => r.json()).then(convs => {
          const match = convs.find?.(c => c._id === userId)
          if (match?.user) setActiveUser(match.user)
          setPageLoading(false)
        }).catch(() => setPageLoading(false))
      } else {
        setPageLoading(false)
      }
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async e => {
    e.preventDefault()
    if ((!text.trim() && !mediaUrls.length) || !activeId) return
    setSending(true)
    const res = await apiFetch(`/api/messages/${activeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim(), media: mediaUrls }),
    })
    const msg = await res.json()
    setMessages(prev => [...prev, { ...msg, senderUsername: session.user.username }])
    socket?.emit('direct-message', { to: activeId, msg: { ...msg, senderUsername: session.user.username } })
    setText('')
    setMediaUrls([])
    setSending(false)
    loadConversations()
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

  const me = session?.user?.id
  const totalUnread = conversations.reduce((n, c) => n + (c.unread || 0), 0)
  const filtered = conversations.filter(c =>
    !search || c.user?.username?.toLowerCase().includes(search.toLowerCase())
  )

  if (pageLoading) return (
    <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em' }}>
      LOADING...
    </div>
  )

  return (
    <div className="page-fixed-shell" style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#e8e8e8', overflow: 'hidden', fontFamily: 'Space Grotesk, sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <span className="font-head" style={{ fontSize: 17, letterSpacing: '2px', color: '#FDC214' }}>BLKUZZ</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.12em', color: '#008000', border: '1px solid rgba(0,128,0,0.25)', padding: '3px 8px' }}>
          <span className="animate-pulse2" style={{ width: 5, height: 5, background: '#008000', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
          SECURE CHANNEL
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Sidebar — on mobile, hidden once a conversation is open; always visible at lg+ */}
        <div className={`w-full lg:w-[40%] ${activeId ? 'hidden lg:flex' : 'flex'}`} style={{ borderRight: '1px solid #141414', flexDirection: 'column', minHeight: 0 }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid #141414', flexShrink: 0 }}>
            {[{ key: 'messages', label: 'TRANSMISSIONS', badge: totalUnread }, { key: 'requests', label: 'REQUESTS', badge: requests.length }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex: 1, padding: '10px 8px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: tab === t.key ? '1px solid #FDC214' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.18em', color: tab === t.key ? '#FDC214' : '#333', textTransform: 'uppercase' }}>{t.label}</span>
                {t.badge > 0 && (
                  t.key === 'requests'
                    ? <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#D2042D', boxShadow: '0 0 6px 2px rgba(210,4,45,0.5)' }} />
                    : <span style={{ background: '#D2042D', color: '#fff', fontSize: 8, fontFamily: 'IBM Plex Mono, monospace', borderRadius: 9999, padding: '1px 5px', lineHeight: 1.4 }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          {tab === 'messages' && (
            <>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #141414', flexShrink: 0 }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="SEARCH..."
                  className="placeholder-white"
                  style={{ width: '100%', background: 'transparent', border: '1px solid #FDC214', color: '#888', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, padding: '6px 10px', outline: 'none', letterSpacing: '0.05em', borderRadius: 9999 }}
                />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                {filtered.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20 }}>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No transmissions.</p>
                  </div>
                )}
                {filtered.map(c => {
                  const isActive = activeId === c._id
                  const hasUnread = c.unread > 0
                  return (
                    <div key={c._id}
                      onClick={() => openConversation(c._id, c.user)}
                      style={{ display: 'flex', gap: 10, padding: '11px 14px', borderBottom: '1px solid #0f0f0f', cursor: 'pointer', position: 'relative', background: isActive ? '#0f0f0f' : 'transparent', borderLeft: isActive ? '2px solid #00ff88' : '2px solid transparent', transition: 'background 0.1s' }}
                    >
                      <Avatar user={c.user} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span className="font-head" style={{ fontSize: 13, color: '#FDC214', letterSpacing: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.user?.name || c.user?.username || 'Unknown'}
                          </span>
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                            {c.lastMessage?.createdAt ? timeAgo(c.lastMessage.createdAt) : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
                          {c.lastMessage?.content || ''}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>@{c.user?.username}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        {hasUnread && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88' }} />
                        )}
                        <button
                          onClick={async e => {
                            e.stopPropagation()
                            await apiFetch(`/api/messages/${c._id}`, { method: 'DELETE' })
                            if (activeId === c._id) { setActiveId(null); setActiveUser(null); setMessages([]) }
                            loadConversations()
                          }}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                        >
                          <img src="/portal/icons/trash-bin.png" alt="delete" style={{ width: 11, height: 11, filter: 'invert(21%) sepia(95%) saturate(7000%) hue-rotate(342deg) brightness(85%) contrast(115%)' }} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'requests' && (
            <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
              {requests.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20 }}>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No pending requests.</p>
                </div>
              )}
              {requests.map(req => (
                <div key={req._id} style={{ padding: '14px', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Avatar user={req.from} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-head" style={{ fontSize: 12, color: '#FDC214', letterSpacing: '2px', marginBottom: 4 }}>
                        @{req.from?.username || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>{req.text}</div>
                      {(req.bulletinPost || req.project || req.link) && (
                        <a href={req.bulletinPost ? `/portal/home/collaborate?post=${req.bulletinPost}` : `/portal${req.link}`}
                          style={{ display: 'inline-block', background: 'transparent', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.1em', color: '#FDC214', textTransform: 'uppercase', marginTop: 4, textDecoration: 'none' }}>
                          {req.bulletinPost ? 'View callout →' : req.project ? 'View project →' : 'View →'}
                        </a>
                      )}
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                        {timeAgo(req.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/notifications/${req._id}/respond`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'accept' }),
                        })
                        loadRequests()
                        loadConversations()
                        setTab('messages')
                      }}
                      style={{ padding: '6px 20px', background: 'transparent', border: '1px solid #FDC214', color: '#FDC214', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 9999 }}
                    >
                      ACCEPT
                    </button>
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/notifications/${req._id}/respond`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'decline' }),
                        })
                        loadRequests()
                      }}
                      style={{ padding: '6px 20px', background: 'transparent', border: '1px solid #333', color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 9999 }}
                    >
                      DECLINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thread — on mobile, only shown once a conversation is open */}
        <div className={activeId ? 'flex' : 'hidden lg:flex'} style={{ flex: 1, flexDirection: 'column', minHeight: 0 }}>
          {!activeId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>SELECT A TRANSMISSION</span>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button onClick={() => { setActiveId(null); setActiveUser(null); setMessages([]) }} className="lg:hidden" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#FDC214', flexShrink: 0, lineHeight: 0 }}>
                  <ArrowLeft size={16} />
                </button>
                {!activeUser ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em' }}>LOADING...</span>
                  </div>
                ) : (
                  <>
                <div onClick={() => router.push(`/home/profile/${activeUser.username}`)} style={{ cursor: 'pointer' }}>
                  <Avatar user={activeUser} size={32} style={{ background: '#001a0d', color: 'rgba(0,255,136,0.5)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-head" style={{ fontSize: 14, color: '#FDC214', letterSpacing: '2px' }}>
                    {activeUser.name || activeUser.username}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#fff', letterSpacing: '0.1em', marginTop: 1 }}>
                    @{activeUser.username}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <User size={15} onClick={() => activeUser?.username && router.push(`/home/profile/${activeUser.username}`)} style={{ color: '#FDC214', cursor: 'pointer' }} />
                  <div ref={menuRef} style={{ position: 'relative' }}>
                    <MoreVertical size={15} onClick={() => setMenuOpen(o => !o)} style={{ color: '#FDC214', cursor: 'pointer' }} />
                    {menuOpen && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, background: '#000', border: 'none', zIndex: 100, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.8)' }}>
                        <button onClick={() => { setMenuOpen(false); setConfirmModal('block') }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#aaa', letterSpacing: '0.1em', cursor: 'pointer' }}>
                          Block
                        </button>
                        <button onClick={() => { setMenuOpen(false); setConfirmModal('block-report') }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#D2042D', letterSpacing: '0.1em', cursor: 'pointer' }}>
                          Block and Report
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                  </>
                )}
              </div>

              {/* Encrypted bar */}
              <div style={{ background: 'rgba(0,255,136,0.03)', borderBottom: '1px solid rgba(0,255,136,0.08)', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(0,255,136,0.4)', letterSpacing: '0.1em', flexShrink: 0 }}>
                <Lock size={9} />
                End-to-end encrypted · Blkuzz members only
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12, scrollbarWidth: 'none' }}>
                {messages.map((msg, i) => {
                  const isMine = msg.sender === me || msg.sender?._id === me || msg.sender?.toString() === me
                  const prevMsg = messages[i - 1]
                  const prevIsSame = prevMsg && (prevMsg.sender === msg.sender || prevMsg.sender?._id === msg.sender?._id || prevMsg.sender?.toString() === msg.sender?.toString())
                  return (
                    <div key={msg._id || i} style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                      {!prevIsSame && (
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 3, padding: '0 2px' }}>
                          {isMine ? 'you' : `@${msg.senderUsername || activeUser?.username || ''}`}
                        </div>
                      )}
                      {msg.media?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '75%' }}>
                          {msg.media.map((url, mi) => (
                            isVideo(url)
                              ? <video key={mi} src={url} controls onClick={() => setLightbox(url)} style={{ width: '100%', maxWidth: 220, borderRadius: 5, cursor: 'pointer', border: '1px solid #1a1a1a', display: 'block' }} />
                              : <img key={mi} src={url} alt="" onClick={() => setLightbox(url)} style={{ width: '100%', maxWidth: 220, borderRadius: 5, cursor: 'pointer', border: '1px solid #1a1a1a', objectFit: 'cover', display: 'block' }} />
                          ))}
                        </div>
                      )}
                      {msg.content && (
                        <div style={{
                          maxWidth: '85%', padding: '8px 11px', fontSize: 13, lineHeight: 1.5, position: 'relative',
                          ...(isMine
                            ? { background: 'transparent', border: '1px solid #777', color: '#777', borderRadius: 5 }
                            : { background: 'transparent', border: '1px solid #fff', color: '#fff', borderRadius: 5 }
                          )
                        }}>
                          {/^https?:\/\/\S+$/.test(msg.content?.trim())
                            ? <a href={msg.content.trim()} target="_blank" rel="noopener noreferrer" style={{ color: '#FDC214', textDecoration: 'underline', wordBreak: 'break-all' }}>{msg.content.trim()}</a>
                            : msg.content
                          }
                        </div>
                      )}
                      {(i === messages.length - 1 || messages[i + 1]?.sender !== msg.sender) && (
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.4)', padding: '0 2px', marginTop: 2 }}>
                          {msg.createdAt ? timeAgo(msg.createdAt) : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div style={{ borderTop: '1px solid #141414', flexShrink: 0, background: '#0a0a0a' }}>
                {mediaUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 14px 0' }}>
                    {mediaUrls.map((url, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        {isVideo(url)
                          ? <video src={url} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                          : <img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                        }
                        <button type="button" onClick={() => setMediaUrls(prev => prev.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', top: -5, right: -5, width: 15, height: 15, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDC214', color: '#0a0a0a', fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', lineHeight: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
                <form onSubmit={send} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Paperclip size={17} onClick={() => fileInputRef.current?.click()} style={{ color: uploading ? '#00C853' : '#FDC214', cursor: uploading ? 'default' : 'pointer' }} />
                    <FolderOpen size={17} style={{ color: '#FDC214', cursor: 'pointer' }} />
                  </div>
                  <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Message..."
                    className="placeholder-white"
                    style={{ flex: 1, background: '#111', border: '1px solid #1a1a1a', color: '#e8e8e8', fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, padding: '8px 12px', outline: 'none', borderRadius: 9999 }}
                  />
                  <button type="submit" disabled={sending || (!text.trim() && !mediaUrls.length)} style={{ background: 'transparent', border: 'none', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Send size={15} style={{ color: '#FDC214' }} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
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

      {/* Block / Block & Report confirmation modals */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'transparent', border: '1px solid #FDC214', padding: '28px 24px', maxWidth: 340, width: '90%', borderRadius: 5 }}>
            <p className="font-head" style={{ fontSize: 15, color: '#fff', letterSpacing: '2px', marginBottom: 10 }}>
              {confirmModal === 'block' ? 'Block' : 'Block and Report'} <span style={{ color: '#FDC214' }}>@{activeUser?.username}?</span>
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 24, letterSpacing: '0.05em' }}>
              {confirmModal === 'block'
                ? 'They will be removed from your inbox and will not be able to contact you. They will not be told they have been blocked.'
                : 'They will be removed from your inbox. Our team will review this account.'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '9px 0', background: 'transparent', border: '1px solid #333', color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 9999 }}>
                CANCEL
              </button>
              <button onClick={() => executeBlock(confirmModal === 'block-report')}
                style={{ flex: 1, padding: '9px 0', background: 'transparent', border: `1px solid ${confirmModal === 'block' ? '#aaa' : '#D2042D'}`, color: confirmModal === 'block' ? '#aaa' : '#D2042D', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 9999 }}>
                {confirmModal === 'block' ? 'BLOCK' : 'BLOCK AND REPORT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// useSearchParams() bails out of static prerendering unless wrapped in
// Suspense — without this, `next build` fails on this page entirely.
export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxPageContent />
    </Suspense>
  )
}
