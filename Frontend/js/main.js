/* ─── Blkuzz main.js ─────────────────────────────────────────────── */

const API      = `${API_URL}/web/api`
const PHONE_RE = /^[\d\s\+\-\(\)]{7,20}$/

/* ─── Nav scroll ─────────────────────────────────────────────────── */
const nav = document.getElementById('nav')
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50)
}, { passive: true })

/* ─── Toast system ───────────────────────────────────────────────── */
function showToast(title, message, { html = false, duration = 3500 } = {}) {
  const container = document.getElementById('toastContainer')
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.innerHTML = `<div class="toast-title">${escHtml(title)}</div>${html ? message : escHtml(message)}`
  container.appendChild(toast)
  setTimeout(() => {
    toast.classList.add('removing')
    toast.addEventListener('animationend', () => toast.remove())
  }, duration)
}

function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* ─── Modal ──────────────────────────────────────────────────────── */
const modalOverlay = document.getElementById('modalOverlay')
const modalClose   = document.getElementById('modalClose')

function openModal() {
  populateDisciplineSelect(allDisciplines)
  resetOtp()
  modalOverlay.classList.add('open')
}
function closeModal() {
  modalOverlay.classList.remove('open')
  resetOtp()
}

document.getElementById('applyBtn').addEventListener('click', openModal)
document.getElementById('heroApplyBtn').addEventListener('click', openModal)
document.getElementById('perksApplyBtn').addEventListener('click', openModal)
document.getElementById('downloadApplyBtn').addEventListener('click', openModal)
modalClose.addEventListener('click', closeModal)
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal() })
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() })

/* ─── Location formatter ─────────────────────────────────────────── */
function toTitleCase(str) {
  return str.toLowerCase().split(' ')
    .map(w => w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-'))
    .join(' ')
}

function formatLocation(raw) {
  const parts = raw.split(',')
  if (parts.length < 2) return toTitleCase(parts[0])
  const city    = toTitleCase(parts[0].trim())
  const country = parts.slice(1).join(',').trim().toUpperCase()
  return `${city}, ${country}`
}

function displayLocation(location) {
  if (!location) return ''
  return formatLocation(location)
}

function validateLocation(location) {
  if (!location) return { valid: false, error: 'Please enter your location.' }
  if (!/^[A-Z][a-zA-Z\s\-]+(,\s)[A-Z][a-zA-Z\s]+$/.test(location)) {
    return { valid: false, error: 'Please use the format: City, UK' }
  }
  return { valid: true }
}

const locationEl = document.getElementById('fieldLocation')
locationEl.addEventListener('input', e => {
  const pos = e.target.selectionStart
  const formatted = formatLocation(e.target.value)
  e.target.value = formatted
  try { e.target.setSelectionRange(pos, pos) } catch {}
})

/* ─── Field icons ────────────────────────────────────────────────── */
const SVG_TICK = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00cc66" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
const SVG_CROSS = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF0000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

function setFieldIcon(iconId, state) {
  const el = document.getElementById(iconId)
  if (!el) return
  el.className = 'field-icon'
  if (state === 'ok')    { el.classList.add('icon-ok');    el.innerHTML = SVG_TICK  }
  if (state === 'error') { el.classList.add('icon-error'); el.innerHTML = SVG_CROSS }
  if (!state)            { el.innerHTML = '' }
}

/* ─── Availability checks ───────────────────────────────────────── */
async function checkField(field, value, iconId) {
  if (!value) { setFieldIcon(iconId, null); return }
  try {
    const res  = await fetch(`${API}/check?field=${field}&value=${encodeURIComponent(value)}`)
    const data = await res.json()
    setFieldIcon(iconId, data.available ? 'ok' : 'error')
  } catch { setFieldIcon(iconId, null) }
}

function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

const usernameEl = document.getElementById('fieldUsername')
const emailEl    = document.getElementById('fieldEmail')

const checkUsername = debounce(val => { if (val.length >= 3) checkField('username', val, 'iconUsername') }, 400)
const checkEmail    = debounce(val => { if (val.includes('@') && val.includes('.')) checkField('email', val, 'iconEmail') }, 400)

usernameEl.addEventListener('input', e => {
  e.target.value = e.target.value.toLowerCase()
  setFieldIcon('iconUsername', null)
  checkUsername(e.target.value.trim())
})

emailEl.addEventListener('input', e => {
  e.target.value = e.target.value.toLowerCase()
  setFieldIcon('iconEmail', null)
  checkEmail(e.target.value.trim())
})

/* ─── Phone OTP ──────────────────────────────────────────────────── */
let phoneVerified = false

const sendCodeBtn  = document.getElementById('sendCodeBtn')
const verifyCodeBtn = document.getElementById('verifyCodeBtn')
const otpRow       = document.getElementById('otpRow')
const otpStatus    = document.getElementById('otpStatus')

function resetOtp() {
  phoneVerified = false
  otpRow.style.display = 'none'
  document.getElementById('fieldOtp').value = ''
  otpStatus.textContent = ''
  otpStatus.style.color = ''
  sendCodeBtn.textContent = 'Send Code'
  sendCodeBtn.disabled = false
}

sendCodeBtn.addEventListener('click', async () => {
  const phone = document.getElementById('fieldPhone').value.trim()
  if (!PHONE_RE.test(phone)) { showToast('Invalid phone', 'Please enter a valid UK phone number.'); return }

  sendCodeBtn.textContent = 'Checking…'
  sendCodeBtn.disabled = true

  try {
    const checkRes  = await fetch(`${API}/check?field=phone&value=${encodeURIComponent(phone)}`)
    const checkData = await checkRes.json()
    if (!checkData.available) {
      showToast('Already registered', 'This phone number is already linked to an account.')
      sendCodeBtn.textContent = 'Send Code'
      sendCodeBtn.disabled = false
      return
    }
  } catch {
    showToast('Error', 'Could not verify phone number. Please try again.')
    sendCodeBtn.textContent = 'Send Code'
    sendCodeBtn.disabled = false
    return
  }

  sendCodeBtn.textContent = 'Sending…'
  phoneVerified = false
  otpStatus.textContent = ''

  try {
    const res  = await fetch(`${API}/verify/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone })
    })
    const data = await res.json()
    if (!res.ok) { showToast('Error', data.error); sendCodeBtn.textContent = 'Send Code'; sendCodeBtn.disabled = false; return }
    otpRow.style.display = 'flex'
    sendCodeBtn.textContent = 'Resend'
    sendCodeBtn.disabled = false
    otpStatus.textContent = 'Code sent — check your messages.'
    otpStatus.style.color = '#aaa'
  } catch {
    showToast('Error', 'Could not send code. Please try again.')
    sendCodeBtn.textContent = 'Send Code'
    sendCodeBtn.disabled = false
  }
})

verifyCodeBtn.addEventListener('click', async () => {
  const phone = document.getElementById('fieldPhone').value.trim()
  const code  = document.getElementById('fieldOtp').value.trim()
  if (!code) return

  verifyCodeBtn.textContent = 'Checking…'
  verifyCodeBtn.disabled = true

  try {
    const res  = await fetch(`${API}/verify/check`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone, code })
    })
    const data = await res.json()
    if (res.ok && data.valid) {
      phoneVerified = true
      otpStatus.textContent = '✓ Phone verified'
      otpStatus.style.color = '#00cc66'
      verifyCodeBtn.textContent = '✓ Verified'
    } else {
      otpStatus.textContent = data.error || 'Incorrect code. Try again.'
      otpStatus.style.color = '#FF0000'
      verifyCodeBtn.textContent = 'Verify'
      verifyCodeBtn.disabled = false
    }
  } catch {
    otpStatus.textContent = 'Something went wrong. Try again.'
    otpStatus.style.color = '#ff4444'
    verifyCodeBtn.textContent = 'Verify'
    verifyCodeBtn.disabled = false
  }
})

document.getElementById('applyForm').addEventListener('submit', async e => {
  e.preventDefault()
  const name     = document.getElementById('fieldName').value.trim()
  const username = document.getElementById('fieldUsername').value.trim()
  const email    = document.getElementById('fieldEmail').value.trim()
  const password = document.getElementById('fieldPassword').value
  const location = document.getElementById('fieldLocation').value.trim()
  const phone    = document.getElementById('fieldPhone').value.trim()
  const bio      = document.getElementById('fieldBio').value.trim()

  if (!name || !username || !email || !password || !location || !phone || !bio) { showToast('Missing fields', 'Please fill in all required fields.'); return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))          { showToast('Invalid email', 'Please enter a valid email address.'); return }
  if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase()))  { showToast('Invalid username', 'Username must be 3–20 characters: letters, numbers or underscores only.'); return }
  if (password.length < 8)                                  { showToast('Weak password', 'Password must be at least 8 characters.'); return }
  if (!PHONE_RE.test(phone))                                { showToast('Invalid phone', 'Please enter a valid phone number.'); return }
  const locCheck = validateLocation(location)
  if (!locCheck.valid)                                      { showToast('Invalid location', locCheck.error); return }
  if (!phoneVerified)                                       { showToast('Verify your number', 'Please verify your phone number before submitting.'); return }

  try {
    const res  = await fetch(`${API}/signups`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, username, email, password, tags: selectedTags, location, phone, bio })
    })
    const data = await res.json()
    if (res.status === 409) {
      showToast('Already taken', data.error)
      const isUser  = data.field === 'username' || data.error?.toLowerCase().includes('username')
      const iconId  = isUser ? 'iconUsername' : 'iconEmail'
      const inputId = isUser ? 'fieldUsername' : 'fieldEmail'
      setFieldIcon(iconId, 'error')
      document.getElementById(inputId)?.addEventListener('input', () => setFieldIcon(iconId, null), { once: true })
      return
    }
    if (!res.ok) throw new Error(data.error)
    closeModal()
    showToast('Application received', `Thanks ${escHtml(username)}! You can now log into the members portal. <a href="http://localhost:3001/portal/login" style="color:#FDC214;text-decoration:underline">Login here</a>`, { html: true, duration: 7000 })
    e.target.reset()
    if (data.totalMembers != null) animateCount('stat-members', data.totalMembers)
  } catch {
    showToast('Error', 'Something went wrong. Please try again.')
  }
})

/* ─── Fade-up IntersectionObserver ──────────────────────────────── */
const fadeObserver = new IntersectionObserver(
  entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible')
      fadeObserver.unobserve(entry.target)
    }
  }),
  { threshold: 0.12 }
)
document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el))

/* ─── Ticker ─────────────────────────────────────────────────────── */
function pluralize(name) {
  const words = name.split(' ')
  const last  = words[words.length - 1]
  let plural
  if (/(?:s|x|z|sh|ch)$/i.test(last))   plural = last + 'es'
  else if (/[^aeiou]y$/i.test(last))     plural = last.slice(0, -1) + 'ies'
  else                                   plural = last + 's'
  words[words.length - 1] = plural
  return words.join(' ')
}

function buildTicker(disciplines) {
  const track = document.getElementById('tickerTrack')

  const pool = disciplines.length
    ? disciplines.flatMap(d => d.tags || []).map(t => pluralize(t))
    : ['Filmmakers', 'Musicians', 'Designers', 'Photographers', 'Dancers', 'Writers', 'Painters', 'Architects']

  const items = pool.sort(() => Math.random() - 0.5).slice(0, 8)

  const render = () => items.map(name =>
    `<span class="ticker-item">${escHtml(name.toUpperCase())}</span>`
  ).join('')

  track.innerHTML = render() + render()
}

/* ─── Stats ──────────────────────────────────────────────────────── */
let totalMemberCount = 0

async function loadStats() {
  try {
    const res  = await fetch(`${API}/stats`)
    const data = await res.json()
    totalMemberCount = data.totalMembers || 0
    animateCount('stat-members',    totalMemberCount)
    animateCount('stat-collabs',    data.totalCollabs   || 0)
    animateCount('stat-disciplines', data.disciplines   || 0)
  } catch {
    document.getElementById('stat-members').textContent    = '—'
    document.getElementById('stat-collabs').textContent    = '—'
    document.getElementById('stat-disciplines').textContent = '—'
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id)
  if (!el) return
  const duration = 1200
  const start = performance.now()
  function step(now) {
    const progress = Math.min((now - start) / duration, 1)
    const value = Math.round(easeOutQuart(progress) * target)
    el.textContent = value.toLocaleString()
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4) }

const SPINNER_HTML = '<div class="spinner-wrap"><div class="spinner"></div></div>'

/* ─── Disciplines ────────────────────────────────────────────────── */
let allDisciplines = []

async function loadDisciplines() {
  document.getElementById('disciplinesGrid').innerHTML = SPINNER_HTML
  try {
    const res  = await fetch(`${API}/disciplines`)
    const data = await res.json()
    allDisciplines = data.disciplines || []
    buildTicker(allDisciplines)
    buildDisciplinesGrid(allDisciplines)
    populateDisciplineSelect(allDisciplines)
    populateFilterDropdown(allDisciplines)
  } catch {
    buildTicker([])
    buildDisciplinesGrid([])
  }
}

function buildDisciplinesGrid(disciplines) {
  const grid = document.getElementById('disciplinesGrid')
  grid.innerHTML = ''

  const allPill = makeTagPill('All', null, true)
  grid.appendChild(allPill)

  disciplines.flatMap(d => d.tags || []).forEach(tag => {
    grid.appendChild(makeTagPill(tag, tag, false))
  })
}

function makeTagPill(label, tag, active) {
  const el = document.createElement('button')
  el.className = 'discipline-tile' + (active ? ' active' : '')
  el.textContent = label
  el.addEventListener('click', () => {
    document.querySelectorAll('#disciplinesGrid .discipline-tile').forEach(p => p.classList.remove('active'))
    el.classList.add('active')
    if (tag) {
      loadMembers({ tag })
    } else {
      loadFeaturedMembers()
    }
    document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })
  })
  return el
}

let selectedTags = []

function populateDisciplineSelect(disciplines) {
  const picker = document.getElementById('fieldTags')
  if (!picker) return
  picker.innerHTML = ''
  selectedTags = []

  const fallback = ['Filmmaker', 'Visual Artist', 'Graphic Designer', 'Musician', 'Writer', 'Photographer', 'Dancer', 'Producer']
  const tags = disciplines.length
    ? disciplines.flatMap(d => d.tags || [])
    : fallback

  tags.forEach(name => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tag-option'
    btn.textContent = name
    btn.addEventListener('click', () => {
      if (btn.classList.contains('tag-option-selected')) {
        btn.classList.remove('tag-option-selected')
        selectedTags = selectedTags.filter(t => t !== name)
      } else if (selectedTags.length < 4) {
        btn.classList.add('tag-option-selected')
        selectedTags.push(name)
      }
      const atMax = selectedTags.length >= 4
      picker.querySelectorAll('.tag-option:not(.tag-option-selected)').forEach(t => {
        t.classList.toggle('tag-option-disabled', atMax)
      })
    })
    picker.appendChild(btn)
  })
}

/* ─── Spotlight member (membership section card) ─────────────────── */
async function loadSpotlightMember() {
  const card = document.getElementById('spotlightCard')
  if (!card) return

  card.innerHTML = SPINNER_HTML
  try {
    const res    = await fetch(`${API}/members/spotlight`)
    const { member } = await res.json()
    if (!member) return

    const name       = escHtml(member.name || 'Unknown')
    const discipline = escHtml(member.discipline || 'Creative')
    const location   = escHtml(displayLocation(member.location) || 'UK')
    const bio        = escHtml((member.bio || '').slice(0, 180))
    const bioSuffix  = member.bio && member.bio.length > 180 ? '…' : ''
    const tags       = (member.tags || []).slice(0, 4)
    const year       = member.createdAt ? new Date(member.createdAt).getFullYear() : '—'

    const spotlightSrc = member.avatarUrl || member.avatar?.url || ''
    const avatarHtml = spotlightSrc
      ? `<img src="${escHtml(spotlightSrc)}" alt="${name}" class="profile-avatar-img" />`
      : `<div class="profile-avatar">${getInitials(member.name || 'BK')}</div>`

    card.innerHTML = `
      ${avatarHtml}
      <div class="profile-name">${name}</div>
      ${bio ? `<p class="profile-bio">${bio}${bioSuffix}</p>` : ''}
      ${tags.length ? `<div class="profile-tags">${tags.map(t => `<span class="tag-pill">${escHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="profile-status">
        <span class="status-dot"></span>
        Member since: ${year}
      </div>
    `

  } catch (err) {
    console.error('loadSpotlightMember error:', err)
    card.innerHTML = `
      <div class="profile-avatar">BK</div>
      <div class="profile-name">Blkuzz Member</div>
      <div class="profile-discipline">Creative</div>
      <p class="profile-bio">Join Blkuzz to connect with the UK's most forward-thinking creatives.</p>
      <div class="profile-status">
        <span class="status-dot"></span>
        Active community
      </div>
    `
  }
}

/* ─── Featured members ───────────────────────────────────────────── */
async function loadFeaturedMembers() {
  document.getElementById('membersGrid').innerHTML = SPINNER_HTML
  try {
    const res  = await fetch(`${API}/members/featured`)
    const data = await res.json()
    renderMembersGrid(data.members || [], true)
  } catch {
    renderMembersGrid([], true)
  }
}

/* ─── Members (filtered) ─────────────────────────────────────────── */
async function loadMembers(params = {}) {
  document.getElementById('membersGrid').innerHTML = SPINNER_HTML
  const query = new URLSearchParams()
  if (params.category) query.set('category', params.category)
  if (params.tag)      query.set('tag',      params.tag)
  if (params.search)   query.set('search',   params.search)
  if (params.status)   query.set('status',   params.status)
  query.set('limit', '5')

  try {
    const res  = await fetch(`${API}/members?${query}`)
    const data = await res.json()
    renderMembersGrid(data.members || [], true)
  } catch {
    renderMembersGrid([], true)
  }
}

/* ─── Render grid ────────────────────────────────────────────────── */
function renderMembersGrid(members, showLocked) {
  const grid = document.getElementById('membersGrid')
  grid.innerHTML = ''

  if (!members.length) {
    grid.innerHTML = '<div class="members-empty">No members found for this search.</div>'
    return
  }

  members.forEach(member => grid.appendChild(buildCreatorCard(member)))

  if (showLocked) {
    grid.appendChild(buildLockedCard())
  }

  initCardHotspots()
}

function buildCreatorCard(member) {
  const wrap = document.createElement('div')
  wrap.className = 'card-wrap'

  const displayName  = escHtml(member.name || member.username)
  const initials     = getInitials(member.name || member.username)
  const discipline   = escHtml(member.tags?.[0] || 'Creative')
  const location     = escHtml(member.location || 'UK')
  const bio          = escHtml((member.bio || 'No bio available.').slice(0, 220))
  const rawLookingFor = member.collaborationTarget || ''
  const lookingFor    = rawLookingFor
    ? escHtml(rawLookingFor.slice(0, 50)) + (rawLookingFor.length > 50 ? '…' : '')
    : '—'
  const year         = member.createdAt ? new Date(member.createdAt).getFullYear() : '—'
  const memberNum    = 'BLK-' + String(member._id || '0000').slice(-4).toUpperCase()
  const avatarSrc = member.avatarUrl || member.avatar?.url || ''
  const avatarHtml = avatarSrc
    ? `<img src="${escHtml(avatarSrc)}" alt="${displayName}" class="card-avatar-img" />`
    : `<div class="card-avatar">${initials}</div>`

  wrap.innerHTML = `
    <div class="creator-card">
      <div class="card-face">
        <div class="card-avatar-row">
          ${avatarHtml}
          <div class="card-status">
            <span class="status-dot"></span>
            Active member
          </div>
        </div>
        <div class="card-name">${displayName}</div>
        <div class="card-discipline">${discipline}</div>
        ${member.bio ? `<p class="card-front-bio">${escHtml(member.bio.slice(0, 60))}${member.bio.length > 60 ? '…' : ''}</p>` : ''}
      </div>
      <div class="card-face card-back">
        <div class="card-back-label">Bio</div>
        <div class="card-back-bio">${bio}${member.bio && member.bio.length > 220 ? '…' : ''}</div>
        <div class="card-back-label">Collaborators</div>
        <div class="card-back-value" style="font-size:0.8rem">${lookingFor}</div>

      </div>
    </div>
  `

  return wrap
}

function buildLockedCard() {
  const div = document.createElement('div')
  div.className = 'card-locked'
  div.onclick = openModal
  div.innerHTML = `
    <div class="lock-icon">⊘</div>
    <p class="lock-text">This profile and others are visible to Blkuzz members only.</p>
    <div class="lock-cta">Apply for Access →</div>
  `
  return div
}

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

/* ─── Search ─────────────────────────────────────────────────────── */
let searchTimer = null
document.getElementById('searchInput').addEventListener('input', e => {
  clearTimeout(searchTimer)
  const q = e.target.value.trim()
  searchTimer = setTimeout(() => {
    if (q.length >= 2) {
      loadMembers({ search: q })
    } else if (q.length === 0) {
      loadFeaturedMembers()
    }
  }, 300)
})

/* ─── Filter pills + discipline panel ───────────────────────────── */
const filterPill      = document.getElementById('filterPill')
const disciplinePanel = document.getElementById('disciplineFilters')

function setActivePill(el) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'))
  el.classList.add('active')
}

document.querySelector('[data-filter="all"]').addEventListener('click', () => {
  setActivePill(document.querySelector('[data-filter="all"]'))
  disciplinePanel.classList.remove('open')
  disciplinePanel.querySelectorAll('.discipline-filter-item').forEach(i => i.classList.remove('selected'))
  loadFeaturedMembers()
})

filterPill.addEventListener('click', () => {
  setActivePill(filterPill)
  disciplinePanel.classList.toggle('open')
})

function populateFilterDropdown(disciplines) {
  disciplinePanel.innerHTML = ''
  disciplines.forEach(d => {
    const btn = document.createElement('button')
    btn.className = 'discipline-filter-item'
    btn.textContent = d.name
    btn.addEventListener('click', () => {
      disciplinePanel.querySelectorAll('.discipline-filter-item').forEach(i => i.classList.remove('selected'))
      btn.classList.add('selected')
      loadMembers({ category: d.name })
    })
    disciplinePanel.appendChild(btn)
  })
}

/* ─── Card glass hotspot ─────────────────────────────────────────── */
function initCardHotspots() {
  document.querySelectorAll('.card-wrap').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width  * 100).toFixed(1)
      const y = ((e.clientY - r.top)  / r.height * 100).toFixed(1)
      card.style.setProperty('--mx', `${x}%`)
      card.style.setProperty('--my', `${y}%`)
    }, { passive: true })
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--mx', '28%')
      card.style.setProperty('--my', '12%')
    })
  })
}

/* ─── HQ Video ───────────────────────────────────────────────────── */
let hqVideos = []
let hqIdx    = 0

const hqVideoEl = document.getElementById('hqVideo')

async function loadHqVideos() {
  try {
    const res  = await fetch(`${API}/hq-videos`)
    const data = await res.json()
    hqVideos = Array.isArray(data) ? data : []
    if (!hqVideos.length) return

    hqIdx = Math.floor(Math.random() * hqVideos.length)
    playHqVideo(hqIdx)
  } catch {}
}

function playHqVideo(idx) {
  if (!hqVideoEl || !hqVideos.length) return
  const v = hqVideos[idx]
  hqVideoEl.src = v.url
  hqVideoEl.load()
  hqVideoEl.play().catch(() => {})
  fetch(`${API}/hq-videos/view`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ key: v.key })
  }).catch(() => {})
}

if (hqVideoEl) {
  hqVideoEl.addEventListener('ended', () => {
    hqIdx = (hqIdx + 1) % hqVideos.length
    playHqVideo(hqIdx)
  })
}

const hqSoundBtn     = document.getElementById('hqSoundBtn')
const hqIconMuted    = document.getElementById('hqIconMuted')
const hqIconSound    = document.getElementById('hqIconSound')

if (hqSoundBtn && hqVideoEl) {
  hqSoundBtn.addEventListener('click', () => {
    hqVideoEl.muted = !hqVideoEl.muted
    hqIconMuted.style.display = hqVideoEl.muted ? '' : 'none'
    hqIconSound.style.display = hqVideoEl.muted ? 'none' : ''
  })
}

/* ─── Boot ───────────────────────────────────────────────────────── */
;(async function init() {
  await loadStats()
  await Promise.all([
    loadDisciplines(),
    loadFeaturedMembers(),
    loadSpotlightMember(),
    loadHqVideos()
  ])
})()

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') loadStats()
})