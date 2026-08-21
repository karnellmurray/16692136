# Blkuzz — App Overview

Blkuzz is a members-only creative collaboration platform. The repo is a
monorepo with four independent apps that share a MongoDB cluster and an S3
bucket but are otherwise deployed and run separately.

| App | Tech | Purpose | Hosting |
|---|---|---|---|
| `Frontend` | Static HTML/CSS/JS | Public marketing site, waitlist signup, legal pages | Vercel |
| `Backend` | Express (Node) | API behind the Frontend — public member directory, signups, phone verification, HQ video stats | Render |
| `blkuzz-portal` | Next.js 14 (App Router) | The actual member-facing app — the product | Render |
| `admin-portal` | Next.js 14 (App Router) | Internal admin dashboard | Render |

All three Node apps use a **custom `server.js`** (not `next start`) — `blkuzz-portal`'s
also runs a Socket.io server on the same HTTP server for real-time features.

---

## Frontend

Plain static site, no build step, no framework. `index.html` + `js/main.js` +
`js/config.js` (API base URL). Talks to `Backend`'s API for the public member
spotlight/directory, waitlist signups, and HQ video view counts. Also serves
`privacy.html`, `terms.html`, `club-rules.html`.

Deployed on Vercel; `Backend`'s CORS config explicitly allows both a fixed
origin and any `*.karnellmurrays-projects.vercel.app` preview URL.

## Backend

Small Express API (`server.js` → `routes/web.js` → `controllers/`). Endpoints:

- `GET /members`, `/members/spotlight`, `/members/featured`, `/members/:username` — public member directory data
- `GET /disciplines`, `/check` (username availability), `/stats`
- `POST /signups` — waitlist submissions
- `GET /hq-videos`, `POST /hq-videos/view` — HQ showcase video + view tracking
- `POST /verify/send`, `/verify/check` — phone OTP via Twilio

Models: `Signup`, `Otp`, `HqVideoStats`. Uses `helmet` + a locked-down CSP,
`express-rate-limit` (trusts exactly one proxy hop, matching Render's setup),
and its own S3 client config (`config/aws.js`) for the same bucket
`blkuzz-portal` uses.

## admin-portal

Next.js app, `basePath: '/bz-admin'`, NextAuth for admin login. Small surface:

- `app/api/analytics`, `/members`, `/pitches`, `/stats` — read-mostly dashboard data
- `app/dashboard` — the actual UI

Reads from the same MongoDB models `blkuzz-portal` writes (`Signup`, `Pitch`,
etc.) — no independent data model of its own.

---

## blkuzz-portal — the main app

Next.js 14 App Router, `basePath: '/portal'` (every client-side fetch must go
through `lib/api.js`'s `apiFetch()` helper, which prepends `/portal` — a raw
`fetch('/api/...')` will 404 in production). Custom `server.js` wraps Next's
request handler in a plain `http.createServer` and attaches a Socket.io
server to it (`global.io`), used for real-time chat and best-effort upload-
ready push notifications.

**Auth**: NextAuth credentials provider (`lib/authOptions.js`) — username-or-
email + password (bcrypt), session-based, with login rate limiting
(`lib/rateLimit.js` + `RateLimitEvent` model), a 14-day username-change
cooldown, and a forgot/reset-password flow via Resend email (`lib/resend.js`).

### Navigation / features

Sidebar (`components/Sidebar.js`) top-level nav: **Feed, Projects, Collaborate,
Inbox, Groupchat, Work with us, Directory** — plus a Settings dropdown
(Edit profile, Sign out, System → Privacy → Blocked members, System → Report
Bugs, System → Account → Delete account [not yet wired up]).

- **Feed** (`app/home/feed`) — a stylised "screen-wall" mosaic grid of recent
  activity across the platform (projects, callouts, collabs, milestones), plus
  a scrolling ticker and a rotating "Looking For" ad tile pulled from open
  collab-callouts.
- **Projects** (`app/home/projects`) — members create/manage projects: cover
  image, disciplines, tags, chapters/milestones, collaborators, a post feed
  per project (updates/media/milestones with likes + comments), a Team tab,
  and a "looking for collaborators" flag that surfaces the project in the
  Collaborate feed and the Feed's ad tile.
- **Collaborate** (`app/home/collaborate`) — the callout board (`BulletinPost`
  model): "Looking for" / "Open to work" / "Events" posts, tags, urgent flag,
  optional media, optional link to one of your own projects. Members send
  collab requests either directly (`/api/collab`) or by responding to a
  callout; accept/decline flows create an inbox connection.
- **Inbox** (`app/home/inbox`) — 1:1 direct messages (`Message` model), with
  media/PDF attachments, read receipts, and Socket.io for live delivery.
- **Groupchat** (`app/home/groupchat`) — a single shared "lobby" room plus
  per-room pages, broadcast over Socket.io (not persisted the same way DMs are
  — check `GroupMessage` model for exact persistence behaviour before
  assuming parity with DMs).
- **Work with us** (`app/home/apply`) — the pitch/application form
  (`Pitch` model) for prospective collaborators, with a quarterly slot count.
- **Directory** (`app/home/directory`) — searchable member list.
- **Profile** (`app/home/profile/[username]`, `.../me`, `.../edit`) — public
  profile (bio, tags, skills, projects, collabs, media, activity) and the
  edit form. Follow, share, and message actions live here.
- **Settings** (`app/home/settings/blocked`, `.../report`) — blocked-members
  management and the bug-report form (emails `info@blkuzz.com` via Resend,
  rate-limited 5/hour/user).
- **Admin** (`app/admin/reports`) — in-app moderation view for user reports,
  separate from `admin-portal`.

### Data models (`models/`)

`Signup` (the user account model — despite the name, this *is* the user
table), `User` (legacy/secondary — check before assuming which one a given
route uses), `Project`, `ProjectPost`, `ProjectComment`, `BulletinPost`
(callouts), `CollabRequest`, `Message`, `GroupMessage`, `Notification`,
`Pitch`, `MediaUpload` (async upload tracking, see below), `Block`, `Report`,
`Config`, `RateLimitEvent`, `HqVideoStats`, `Post` (legacy — verify still
referenced before relying on it).

### Media upload pipeline

Rebuilt this session from a single synchronous route into an async pipeline,
because large video uploads were blocking the request/response cycle:

1. **`POST /api/upload/presign`** — creates a `MediaUpload` doc
   (`status: 'processing'`), returns an S3 **presigned POST** (not PUT — POST
   policies support `content-length-range`, which is how the size cap is
   enforced) against a **separate, private raw bucket**
   (`AWS_S3_RAW_BUCKET_NAME`).
2. Client uploads directly browser→S3 (server never sees the bytes).
3. **`POST /api/upload/process/[id]`** — fires the actual worker
   (`lib/uploadWorker.js`) un-awaited, returns `202` immediately. This only
   works because Render's dyno is awake for the request that triggers it —
   there is deliberately **no background job queue**, since the free/idle-
   sleep tier can't guarantee a long-running process survives.
4. **`GET /api/upload/status/[id]`** — the client polls this; if a job is
   stuck `processing` past ~90s it re-kicks the worker itself, doubling as
   the retry mechanism.
5. **The worker** re-sniffs the real file type via magic bytes (`file-type`,
   never trusts the client-claimed MIME), then branches:
   - **video** → `ffmpeg` transcode to H.264 + watermark overlay (existing
     logic, unchanged)
   - **audio** → `ffmpeg` transcode to 192kbps MP3
   - **HEIC/HEIF image** → pre-converted to JPEG (`heic-convert`, pure-JS,
     since this sharp build has no HEVC decoder) before the normal image path
   - **image** → `sharp` resize/compress to webp
   - **PDF** → passed through untouched, keyed as
     `uploads/{type}/{id}/{original-filename}` (the only type that keeps its
     real filename in the URL, since it renders as a named file card, not a
     thumbnail)
   - any transcode/processing failure falls back to storing the raw bytes as
     `application/octet-stream` rather than leaving the upload stuck
   - on success, deletes the raw object; on genuine failure, marks
     `status: 'failed'`

Finished files land in the existing public bucket (`AWS_S3_BUCKET_NAME`) at
`uploads/{type}/{id}.{ext}` (or the PDF path above) behind CloudFront
(`AWS_S3_CLOUDFRONT_URL`) — this naming scheme is untouched from before the
rework, so old URLs keep resolving.

**Deletion**: `lib/s3Delete.js` (`deleteOwnedUpload` / `deleteOwnedUploads`)
is the only thing allowed to delete from the public bucket. It hard-guards
that a key starts with `uploads/` (a separate, unrelated external writer puts
bare keys like `avatars/temp/{username}/...` directly into Mongo — never
touch those), and also deletes the matching `MediaUpload` tracking doc (the
id is embedded in the key). Wired into every mutation that replaces/removes
media: avatar and cover replace, project delete cascade, post/callout media
edit and delete. Always called **after** the corresponding Mongo write
succeeds, and always with an explicit, bounded key list — never a sweep.

**Known gap**: the diff-based media-edit PATCH routes (`ProjectPost`,
`BulletinPost`) do a full-array replace with no version check, so two racing
edits of the same post can let a stale save resurrect a URL whose S3 object
a newer save already deleted. Documented, not fixed — would need optimistic
concurrency to close properly.

### Notifications (`Notification` model)

Types: `follow`, `message`, `mention`, `collab_invite`, `collab_request`,
`comment`, `project_post`, `like`, `system`. Fires on: someone follows your
project, a DM arrives, a collab invite/request and its accept/decline (both
directions notify), a comment or like on your project post, and a new post
from a project you follow. `like` only fires on the like transition (not
unlike), never self-notifies. Delivered via `GET /api/notifications` (poll)
plus a best-effort Socket.io push where a connection happens to be open.

### Real-time (Socket.io)

Single server instance attached to `global.io` in `server.js`. Personal
rooms are `user:{id}` (join happens client-side). Used for: DM delivery,
group-chat broadcast, and the upload worker's best-effort "your media is
ready" push. Only `app/home/inbox` and `app/home/groupchat` actually open a
socket connection — most pages rely on polling instead, deliberately (see
media pipeline section above for why polling was made the load-bearing
mechanism rather than assuming a socket is always present).

---

## Environment variables (blkuzz-portal)

Names only — actual values live in the git-ignored `.env.local` / the
Render dashboard, never commit real values here.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongo connection string — **see the DB warning below, local and production do not point at the same database** |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | NextAuth session signing / callback base URL |
| `PORT` | HTTP port for `server.js` |
| `AWS_REGION` | S3 region |
| `AWS_S3_BUCKET_NAME` | Public bucket — finished/processed media |
| `AWS_S3_RAW_BUCKET_NAME` | Private bucket — raw uploads pending processing |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | IAM credentials (`upload-service` user) |
| `AWS_S3_CLOUDFRONT_URL` | CDN in front of the public bucket |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email (password reset, bug reports) |

---

## Deployment & operational notes

- **Branches**: work happens on `Staging-Area`. A `Production` branch exists
  but has historically lagged far behind — check how far behind before
  assuming it reflects what's live; confirm with whoever manages Render/
  Vercel which branch each service actually deploys from before treating
  "Production" as authoritative.
- **Render free/idle-sleep tier**: the dyno sleeps on inactivity and (on the
  free tier specifically) has a tight RAM ceiling (historically ~512MB for
  Render's free web service instances). This is why the upload pipeline has
  no background worker process, and why a large video transcode can OOM-kill
  the *entire app process* (not just fail that one upload) — `ffmpeg`
  decoding/encoding raw frames plus in-memory buffering of the whole source
  file can exceed what's available. `MAX_UPLOAD_BYTES` (500MB, in
  `app/api/upload/presign/route.js`) is currently more generous than what's
  actually safe to process in-memory on that tier — treat this as a real,
  uncalibrated risk, not just a theoretical one.
- **No health check endpoint** exists anywhere in `blkuzz-portal` — no
  `/health` or `/healthz` route, no `render.yaml` in the repo configuring one
  either.
- **Local dev database vs. production**: `.env.local`'s `MONGODB_URI` has
  historically pointed at a *copy* database (`Blkuzz-Copy-18826`), not the
  real production database (`Blkuzz`) — same cluster, different DB name.
  **Critically, both share the same S3 bucket.** A destructive media
  operation (edit/delete media on a post) performed against the local copy
  database will delete the real, shared S3 object even though the write only
  touched the copy DB — silently breaking whatever production document still
  references that same URL. This already happened once this session. Don't
  assume local testing against the copy DB is safe for anything that deletes
  S3 objects, until the copy DB gets its own isolated bucket/prefix or local
  dev is moved to read-only S3 credentials.
- **S3 bucket versioning is enabled** on the public bucket — a "deleted"
  object usually just gets a delete marker, not a permanent purge (unless a
  lifecycle rule expires noncurrent versions, which hasn't been confirmed
  either way). The app's own IAM user doesn't have `s3:ListBucketVersions`,
  so recovery/version inspection has to happen through the AWS Console, not
  through the app.

---

## Conventions worth knowing

- **Colors**: gold/yellow accent `#FDC214`, standard grey `#777` (solid, not
  `rgba(255,255,255,0.4)`-style translucent greys — recent work has been
  standardizing older screens onto the solid version), red `#D2042D`
  (destructive/urgent), green `#008000` (active/success), all against a
  near-black `#0a0a0a` background.
- **Fonts**: `IBM Plex Mono` for labels/meta text, `Space Grotesk` for body
  copy, plus a `font-head` display face for titles.
- **Mobile**: `blkuzz-portal/app/mobile.css`, a dedicated stylesheet (not
  Tailwind responsive classes) imported after Tailwind so it can win the
  cascade with `!important` against inline React styles without editing
  every component. Breakpoints at `1024px` and `640px`. Pages that use the
  fixed-position full-bleed layout (`position: fixed; left: 240px` to clear
  the desktop sidebar) need the `page-fixed-shell` class or the mobile
  override that resets `left` never applies — this exact omission caused a
  fully broken mobile layout on the Edit Profile page once already, so add
  the class to any new page using that pattern.
- **`vh` vs `dvh`**: mobile browser toolbars make plain `100vh`/`h-screen`
  unreliable for full-height layout (content can end up clipped below the
  visible area). The established fix is adding a `100dvh` companion value
  (used for both the sidebar drawer and a modal this session) rather than
  replacing `vh` outright, since `dvh` support is assumed via progressive
  enhancement.
- **Live-testing discipline**: this codebase has a strong pattern (established
  through this session's work) of verifying backend/data changes against a
  real running dev server with real throwaway test accounts/data — not just
  trusting a clean build — and cleaning up every test artifact (Mongo docs
  *and* S3 objects) immediately afterward.
