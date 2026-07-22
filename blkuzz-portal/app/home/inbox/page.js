'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import { Send, Lock, Paperclip, FolderOpen, MoreVertical, User } from 'lucide-react'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function initials(username) {
  if (!username) return '?'
  return username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()
}

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

export default function InboxPage() {
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
  const menuRef                           = useRef(null)
  const bottomRef                         = useRef(null)

  // Connect Socket.io
  useEffect(() => {
    if (!session?.user?.id) return
    socket = io('http://localhost:3001')
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
    if (!text.trim() || !activeId) return
    setSending(true)
    const res = await apiFetch(`/api/messages/${activeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim() }),
    })
    const msg = await res.json()
    setMessages(prev => [...prev, { ...msg, senderUsername: session.user.username }])
    socket?.emit('direct-message', { to: activeId, msg: { ...msg, senderUsername: session.user.username } })
    setText('')
    setSending(false)
    loadConversations()
  }

  const me = session?.user?.id
  const totalUnread = conversations.reduce((n, c) => n + (c.unread || 0), 0)
  const filtered = conversations.filter(c =>
    !search || c.user?.username?.toLowerCase().includes(search.toLowerCase())
  )

  if (pageLoading) return (
    <div style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#2a2a2a', letterSpacing: '0.25em' }}>
      LOADING...
    </div>
  )

  return (
    <div style={{ position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#e8e8e8', overflow: 'hidden', fontFamily: 'Space Grotesk, sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <span className="font-head" style={{ fontSize: 15, letterSpacing: '2px', color: '#FDC214' }}>BLKUZZ</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.12em', color: '#008000', border: '1px solid rgba(0,128,0,0.25)', padding: '3px 8px' }}>
          <span className="animate-pulse2" style={{ width: 5, height: 5, background: '#008000', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
          SECURE CHANNEL
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Sidebar */}
        <div style={{ width: '40%', borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid #141414', flexShrink: 0 }}>
            {[{ key: 'messages', label: 'TRANSMISSIONS', badge: totalUnread }, { key: 'requests', label: 'REQUESTS', badge: requests.length }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex: 1, padding: '10px 8px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: tab === t.key ? '1px solid #FDC214' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.18em', color: tab === t.key ? '#FDC214' : '#333', textTransform: 'uppercase' }}>{t.label}</span>
                {t.badge > 0 && (
                  <span style={{ background: '#D2042D', color: '#fff', fontSize: 7, fontFamily: 'IBM Plex Mono, monospace', borderRadius: 9999, padding: '1px 5px', lineHeight: 1.4 }}>{t.badge}</span>
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
                  style={{ width: '100%', background: 'transparent', border: '1px solid #FDC214', color: '#888', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, padding: '6px 10px', outline: 'none', letterSpacing: '0.05em', borderRadius: 9999 }}
                />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                {filtered.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20 }}>
                    <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#333', textAlign: 'center' }}>No transmissions.</p>
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
                          <span className="font-head" style={{ fontSize: 11, color: '#FDC214', letterSpacing: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.user?.name || c.user?.username || 'Unknown'}
                          </span>
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#2a2a2a', flexShrink: 0 }}>
                            {c.lastMessage?.createdAt ? timeAgo(c.lastMessage.createdAt) : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
                          {c.lastMessage?.content || ''}
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#555' }}>@{c.user?.username}</div>
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
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#333', textAlign: 'center' }}>No pending requests.</p>
                </div>
              )}
              {requests.map(req => (
                <div key={req._id} style={{ padding: '14px', borderBottom: '1px solid #141414', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Avatar user={req.from} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-head" style={{ fontSize: 10, color: '#FDC214', letterSpacing: '2px', marginBottom: 4 }}>
                        @{req.from?.username || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 10, color: '#aaa', lineHeight: 1.5 }}>{req.text}</div>
                      {(req.bulletinPost || req.link) && (
                        <a href={req.bulletinPost ? `/portal/home/bulletin?post=${req.bulletinPost}` : `/portal${req.link}`}
                          style={{ display: 'inline-block', background: 'transparent', fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, letterSpacing: '0.1em', color: '#FDC214', textTransform: 'uppercase', marginTop: 4, textDecoration: 'none' }}>
                          View callout →
                        </a>
                      )}
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#333', marginTop: 4 }}>
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
                      style={{ padding: '6px 20px', background: 'transparent', border: '1px solid #FDC214', color: '#FDC214', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 9999 }}
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
                      style={{ padding: '6px 20px', background: 'transparent', border: '1px solid #333', color: '#555', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 9999 }}
                    >
                      DECLINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thread */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!activeId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#333', letterSpacing: '0.15em' }}>SELECT A TRANSMISSION</span>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {!activeUser ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#333', letterSpacing: '0.2em' }}>LOADING...</span>
                  </div>
                ) : (
                  <>
                <div onClick={() => router.push(`/home/profile/${activeUser.username}`)} style={{ cursor: 'pointer' }}>
                  <Avatar user={activeUser} size={32} style={{ background: '#001a0d', color: 'rgba(0,255,136,0.5)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-head" style={{ fontSize: 12, color: '#FDC214', letterSpacing: '2px' }}>
                    {activeUser.name || activeUser.username}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#fff', letterSpacing: '0.1em', marginTop: 1 }}>
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
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#aaa', letterSpacing: '0.1em', cursor: 'pointer' }}>
                          Block
                        </button>
                        <button onClick={() => { setMenuOpen(false); setConfirmModal('block-report') }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#D2042D', letterSpacing: '0.1em', cursor: 'pointer' }}>
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
              <div style={{ background: 'rgba(0,255,136,0.03)', borderBottom: '1px solid rgba(0,255,136,0.08)', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: 'rgba(0,255,136,0.4)', letterSpacing: '0.1em', flexShrink: 0 }}>
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
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7, color: '#2a2a2a', letterSpacing: '0.08em', marginBottom: 3, padding: '0 2px' }}>
                          {isMine ? 'you' : `@${msg.senderUsername || activeUser?.username || ''}`}
                        </div>
                      )}
                      <div style={{
                        maxWidth: '85%', padding: '8px 11px', fontSize: 11, lineHeight: 1.5, position: 'relative',
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
                      {(i === messages.length - 1 || messages[i + 1]?.sender !== msg.sender) && (
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 6, color: '#2a2a2a', padding: '0 2px', marginTop: 2 }}>
                          {msg.createdAt ? timeAgo(msg.createdAt) : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <form onSubmit={send} style={{ borderTop: '1px solid #141414', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: '#0a0a0a' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Paperclip size={17} style={{ color: '#FDC214', cursor: 'pointer' }} />
                  <FolderOpen size={17} style={{ color: '#FDC214', cursor: 'pointer' }} />
                </div>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Message..."
                  className="placeholder-white"
                  style={{ flex: 1, background: '#111', border: '1px solid #1a1a1a', color: '#e8e8e8', fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, padding: '8px 12px', outline: 'none', borderRadius: 9999 }}
                />
                <button type="submit" disabled={sending || !text.trim()} style={{ background: 'transparent', border: 'none', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Send size={15} style={{ color: '#FDC214' }} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Block / Block & Report confirmation modals */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'transparent', border: '1px solid #FDC214', padding: '28px 24px', maxWidth: 340, width: '90%', borderRadius: 5 }}>
            <p className="font-head" style={{ fontSize: 13, color: '#fff', letterSpacing: '2px', marginBottom: 10 }}>
              {confirmModal === 'block' ? 'Block' : 'Block and Report'} <span style={{ color: '#FDC214' }}>@{activeUser?.username}?</span>
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#555', lineHeight: 1.7, marginBottom: 24, letterSpacing: '0.05em' }}>
              {confirmModal === 'block'
                ? 'They will be removed from your inbox and will not be able to contact you. They will not be told they have been blocked.'
                : 'They will be removed from your inbox. Our team will review this account.'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '9px 0', background: 'transparent', border: '1px solid #333', color: '#555', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 9999 }}>
                CANCEL
              </button>
              <button onClick={() => executeBlock(confirmModal === 'block-report')}
                style={{ flex: 1, padding: '9px 0', background: 'transparent', border: `1px solid ${confirmModal === 'block' ? '#aaa' : '#D2042D'}`, color: confirmModal === 'block' ? '#aaa' : '#D2042D', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 9999 }}>
                {confirmModal === 'block' ? 'BLOCK' : 'BLOCK AND REPORT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
