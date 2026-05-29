## Project Overview

Photo Cloud App adalah aplikasi web untuk sistem photobooth wedding/event.

Aplikasi ini memungkinkan vendor/photographer untuk:

- membuat event
- membuat photo session per grup/tamu
- generate QR code unik per photo session
- mengambil foto melalui webcam/browser camera
- upload foto ke Supabase Storage
- menghubungkan foto ke session yang benar
- menampilkan live preview di photographer panel
- menyediakan guest gallery berdasarkan QR session
- menyediakan download foto per session
- mengamankan preview dan download menggunakan signed URL dan backend API

Core business flow:

Vendor login
-> Create Event
-> Open Photographer Panel
-> Create Photo Session
-> QR Code muncul
-> Guest scan QR
-> Photographer capture/upload photo
-> Foto masuk ke session yang benar
-> Guest melihat foto session mereka
-> Guest download single photo / ZIP

---

## Tech Stack

Project ini menggunakan:

- Next.js App Router
- TypeScript
- Prisma ORM
- PostgreSQL via Docker
- NextAuth Credentials Provider
- Supabase Storage
- Tailwind CSS
- JSZip untuk download ZIP
- Cloudflare Tunnel untuk testing HTTPS local
- Browser camera API: `navigator.mediaDevices.getUserMedia`

---

## Development Principles

Saat membantu maintain project ini, ikuti prinsip berikut:

1. Kerjakan perubahan secara bertahap.
2. Jangan ubah banyak area sekaligus kalau tidak perlu.
3. Jelaskan perubahan sebelum memberi code besar.
4. Berikan full code file jika diminta “tinggal copas”.
5. Jaga kompatibilitas dengan flow yang sudah berjalan.
6. Jangan menghapus fitur existing tanpa alasan jelas.
7. Hindari breaking change pada database tanpa migration yang jelas.
8. Jangan expose secret key di client.
9. Jangan menggunakan `SUPABASE_SERVICE_ROLE_KEY` di client component.
10. Prioritaskan MVP yang stabil daripada fitur kompleks.

---

## Current Feature Status

Fitur yang sudah ada / sudah dibangun:

- User authentication
- Login/logout
- Protected dashboard route
- Role-based access control: `admin`, `vendor`, `crew`
- Create event
- Event detail page
- Photo session model
- Create photo session per event
- QR token per photo session
- QR code per photo session
- Guest gallery by QR token
- Upload photo to Supabase Storage
- Metadata photo saved to database
- Photo linked to `photoSessionId`
- Session-specific storage path
- `currentShotCount`
- Auto-complete session when target shots reached
- Reject upload to completed/cancelled session
- Photographer panel
- Webcam capture
- Camera device dropdown
- Live preview polling
- Delete photo
- Recalculate session count/status after delete
- Create next session
- Auto-redirect to existing open session
- Cancel session
- Delete empty session
- Reopen cancelled session
- Empty state when no open session exists
- Guest download single photo
- Guest download all photos as ZIP
- Secure download via backend API
- Secure preview using Supabase signed URL
- Supabase Storage bucket should be private
- Cloudflare Tunnel testing for HTTPS camera access

---

## Important Business Rules

### Event

An event belongs to a user/vendor.

A user should only access their own events from the dashboard and photographer panel.

### Photo Session

One event can have many photo sessions.

Each photo session represents one guest/group session in the photobooth flow.

Photo session fields conceptually include:

- `eventId`
- `createdById`
- `qrToken`
- `targetShots`
- `currentShotCount`
- `status`
- `startedAt`
- `completedAt`

Supported status:

```txt
pending
active
completed
cancelled
```

### Session Status Rules

A new session starts as:

```txt
status = pending
currentShotCount = 0
```

After first successful upload:

```txt
status = active
```

When total photos reach target shots:

```txt
status = completed
```

If user cancels session:

```txt
status = cancelled
```

Upload should be rejected if:

```txt
status = completed
status = cancelled
```

### Create Next Session Rule

If a completed session is open and user clicks “Create Next Session”:

- if there is no `pending` / `active` session, create a new one
- if there is already an open session, redirect to the existing open session

This prevents duplicate open sessions in one event.

### Delete Empty Session Rule

Only allow delete session if:

```txt
status = pending
currentShotCount = 0
photos.length = 0
```

### Cancel Session Rule

Allow cancel if:

```txt
status = pending
status = active
```

Do not hard-delete session that already has photos.

### Reopen Session Rule

Only `cancelled` session can be reopened.

If another `pending` / `active` session exists, redirect to that existing open session instead of reopening.

---

## Storage Rules

Uploaded photo original file path:

```txt
events/[eventId]/sessions/[photoSessionId]/[uniqueFileName]
```

Use `filePath` as the source of truth for storage access.

Do not rely on public `fileUrl` for secure preview/download.

`fileUrl` may exist as legacy/fallback metadata, but secure flows should use:

- Supabase signed URL for preview
- Supabase storage download by `filePath` for download

---

## Secure Preview Rules

Guest gallery and photographer panel should not render preview using public `photo.fileUrl`.

Use signed URL generated server-side:

```ts
getSignedPreviewUrl(photo.filePath);
```

Preview usage:

```txt
guest page -> signed preview URL
photographer panel API -> signed preview URL
client components -> render previewUrl
```

If signed URL expires, user can refresh the page or polling can regenerate URLs.

---

## Secure Download Rules

Single photo download must go through backend API:

```txt
/api/guest/photo/[photoId]/download?qrToken=[qrToken]
```

API should:

1. validate `photoId`
2. validate `qrToken`
3. ensure photo belongs to the session
4. download file from Supabase using `filePath`
5. return file as attachment

ZIP download must go through backend API:

```txt
/api/guest/session/[qrToken]/download
```

API should:

1. validate session by QR token
2. get all photos in session
3. download each file from Supabase using `filePath`
4. create ZIP using JSZip
5. return ZIP as attachment

---

## Authentication

NextAuth is configured with Credentials Provider.

Seed users:

```txt
admin@mail.com / admin123
vendor@mail.com / vendor123
crew@mail.com / crew123
```

Important files:

```txt
lib/auth.ts
app/api/auth/[...nextauth]/route.ts
app/login/page.tsx
proxy.ts or middleware.ts
```

Protected route:

```txt
/dashboard/:path*
```

If using Next.js 16 or newer, prefer `proxy.ts` over `middleware.ts` if middleware warning appears.

Example:

```ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

---

## Environment Variables

Required environment variables:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/photo_cloud_app

NEXTAUTH_SECRET=super-secret-dev-key
NEXTAUTH_URL=http://localhost:3001
APP_URL=http://localhost:3001

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=event-photos
```

Never expose:

```txt
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_SECRET
```

Never commit `.env.local`.

If a key appears in screenshots, logs, or public repo, rotate it.

---

## Local Development Commands

Install dependencies:

```bash
npm install
```

Run PostgreSQL Docker:

```bash
docker compose up -d
```

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Run seed:

```bash
node prisma/seed.js
```

Open Prisma Studio:

```bash
npx prisma studio
```

Run development server on port 3001:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

---

## Local Network Testing

If testing from another device in the same Wi-Fi:

1. run Next.js with:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

2. find laptop IP:

```bash
ipconfig
```

3. set env:

```env
NEXTAUTH_URL=http://[LAPTOP_IP]:3001
APP_URL=http://[LAPTOP_IP]:3001
```

4. open from tablet/phone:

```txt
http://[LAPTOP_IP]:3001
```

Do not mix:

```txt
localhost
127.0.0.1
LAN IP
Cloudflare URL
```

Pick one host and use it consistently.

---

## Cloudflare Tunnel Testing

Use Cloudflare Tunnel when testing camera access on iPad/phone because browser camera requires HTTPS.

Install cloudflared:

```bash
winget install --id Cloudflare.cloudflared
```

Run app:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Run tunnel in separate terminal:

```bash
cloudflared tunnel --url http://localhost:3001
```

Cloudflare will provide a URL like:

```txt
https://random-name.trycloudflare.com
```

Update `.env.local`:

```env
NEXTAUTH_URL=https://random-name.trycloudflare.com
APP_URL=https://random-name.trycloudflare.com
```

Update `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["random-name.trycloudflare.com", "localhost"],
};

export default nextConfig;
```

Restart Next.js after changing env/config.

Important:

- keep the `cloudflared` terminal open
- Quick Tunnel URL is temporary
- if URL changes, update env and config again
- always open app from the Cloudflare URL when testing camera

---

## Camera Behavior

The app supports browser camera preview and capture using `navigator.mediaDevices`.

Current camera use cases:

### Webcam / Tablet Camera

Works directly in browser if:

- page runs on `localhost`, or
- page runs on HTTPS

### iPad / Mobile Camera

Use Cloudflare Tunnel for HTTPS.

If camera permission fails on iPad, check:

- page is HTTPS
- browser permission is allowed
- correct camera device selected
- `playsInline` and `muted` exist on video element

### Digital Camera

Digital camera can appear as a video input if:

- camera supports USB streaming / webcam mode
- device/browser detects it as video input
- correct cable/adaptor is used

For Sony ILCE-7M4:

- use USB Streaming mode, not Transfer File mode
- start with 720p/30fps for stability
- Transfer File mode is for file transfer, not live preview

Important limitation:

Browser camera API only receives video stream.

If photographer presses physical shutter on digital camera, browser does not automatically receive the captured file.

To support physical camera shutter upload, project needs a future tether bridge:

```txt
camera -> tether software -> local folder -> watcher script -> upload API -> photographer panel updates
```

Do not assume physical camera shutter can trigger browser upload automatically.

---

## Camera Mirror Logic

Some webcams/mobile cameras may appear mirrored.

Digital cameras like ILCE-7M4 usually output normal orientation.

Recommended behavior:

- provide UI toggle for mirror correction
- default mirror correction should be off for digital cameras
- if preview/capture is mirrored, user can toggle correction

Mirror correction should affect both:

- preview video
- canvas capture

---

## Important Folder Structure

Main folders:

```txt
app/
  api/
  dashboard/
  guest/
  login/
components/
lib/
prisma/
public/
types/
```

Important files:

```txt
app/api/upload/route.ts
app/api/guest/photo/[photoId]/download/route.ts
app/api/guest/session/[qrToken]/download/route.ts
app/api/events/[eventId]/photographer-panel/route.ts
app/api/events/[eventId]/photo-sessions/route.ts
app/api/photo-sessions/[photoSessionId]/route.ts
app/api/photo-sessions/[photoSessionId]/cancel/route.ts
app/api/photo-sessions/[photoSessionId]/reopen/route.ts

app/dashboard/page.tsx
app/dashboard/events/[eventId]/page.tsx
app/dashboard/events/[eventId]/photobooth/page.tsx
app/dashboard/events/[eventId]/actions.ts

app/guest/session/[qrToken]/page.tsx

components/photographer-camera-capture.tsx
components/photographer-session-live-panel.tsx
components/photo-session-qr.tsx

lib/auth.ts
lib/prisma.ts
lib/supabase.ts
lib/supabase-signed-preview.ts

prisma/schema.prisma
prisma/seed.js
```

---

## API Route Responsibilities

### `/api/upload`

Receives:

```txt
eventId
photoSessionId
file
```

Must:

1. validate file
2. validate event
3. validate photo session belongs to event
4. reject completed/cancelled session
5. upload original file to Supabase
6. save Photo metadata
7. update session count and status

### `/api/events/[eventId]/photographer-panel`

Used for polling photographer panel.

Must:

1. validate authenticated user
2. validate event ownership
3. select session by `sessionId` if provided
4. otherwise select open session
5. attach signed preview URLs to photos
6. return current session data

### `/api/events/[eventId]/photo-sessions`

Creates new photo session.

Must:

1. validate authenticated user
2. validate event ownership
3. if open session exists, return existing session
4. otherwise create new session

### `/api/photos/[photoId]`

Deletes a photo.

Must:

1. validate authenticated user
2. validate event ownership
3. delete file from Supabase
4. delete DB record
5. recalculate session count/status

### `/api/photo-sessions/[photoSessionId]/cancel`

Cancels pending/active session.

### `/api/photo-sessions/[photoSessionId]/reopen`

Reopens cancelled session if no other open session exists.

### `/api/photo-sessions/[photoSessionId]`

Deletes empty pending session only.

---

## UI Pages

### Dashboard

Path:

```txt
/dashboard
```

Shows:

- logged in user info
- list of user events
- create event button
- open event button

### Event Detail

Path:

```txt
/dashboard/events/[eventId]
```

Shows:

- event info
- photo sessions
- QR/session URLs
- open photographer panel link

### Photographer Panel

Path:

```txt
/dashboard/events/[eventId]/photobooth
```

Optional selected session:

```txt
/dashboard/events/[eventId]/photobooth?sessionId=[photoSessionId]
```

Shows:

- current session
- QR code
- camera capture
- live preview
- session actions

### Guest Gallery

Path:

```txt
/guest/session/[qrToken]
```

Shows:

- event title
- session status/progress
- signed preview photos
- download single photo
- download all as ZIP

---

## Coding Style Rules

Use TypeScript.

Prefer explicit types for route params:

```ts
type RouteProps = {
  params: Promise<{
    eventId: string;
  }>;
};
```

Use `await params` because project follows Next.js newer params style.

Use server components by default.

Use `"use client"` only when necessary:

- state
- event handlers
- camera API
- browser APIs
- polling

Use `NextResponse.json()` for API errors.

Always log server errors with clear prefix:

```ts
console.error("UPLOAD_PHOTO_ERROR", error);
```

Keep error messages user-friendly.

---

## Security Rules for AI Agent

Do not:

- move service role key to client component
- fetch Supabase Storage private files from client without signed URL
- expose raw secrets in docs
- remove ownership checks
- allow user to access another vendor’s event
- bypass `qrToken` validation in guest download
- use public file URL for secure preview/download
- commit `.env.local`

Always:

- validate session/user for dashboard APIs
- validate `qrToken` for guest APIs
- use `filePath` for storage access
- use signed URL for preview
- use backend API for download

---

## Common Bugs and Fixes

### Login loops back to `/login`

Check:

- `NEXTAUTH_URL` matches exact browser URL
- `APP_URL` matches exact browser URL
- do not mix localhost/IP/Cloudflare
- clear cookies
- restart server
- confirm seed user exists

### Camera permission denied

Check:

- page is HTTPS or localhost
- Cloudflare tunnel is active
- camera permission allowed
- device is not used by another app

### QR code points to wrong URL

Check:

```env
APP_URL
```

Restart Next.js after changing env.

### Cross-origin blocked in dev

Add hostname to `allowedDevOrigins` in `next.config.ts`.

### Signed preview not showing

Check:

- Supabase bucket name
- service role key
- filePath exists
- bucket private access is handled via signed URL
- helper `getSignedPreviewUrl()` is used server-side

### ZIP download empty/fails

Check:

- photo records have valid filePath
- Supabase files still exist
- `runtime = "nodejs"` is set
- JSZip is installed

---

## Branch and Issue Workflow

Use feature branches.

Example:

```bash
git checkout -b feat/35-secure-preview-signed-url
```

Commit format:

```txt
feat: add secure signed photo preview
fix: correct nextauth callback url
refactor: clean photographer panel layout
docs: add project documentation
```

Before closing issue, verify:

- feature works
- no regression in photographer panel
- no regression in guest gallery
- no broken auth
- no exposed secret
- acceptance criteria are met

---

## Current Open/Planned Work

Potential next work:

### Background worker / image processing

Status: implemented for MVP / issue #15.

Goal:

- generate thumbnail
- compress image
- reduce gallery load
- keep original file for download

Current implementation:

- upload stores original file in Supabase Storage
- `Photo.imageProcessingStatus` tracks queued, processing, completed, or failed
- `enqueueImageProcessingJob()` starts an in-process background worker after upload
- worker resizes and compresses a JPEG thumbnail via `sharp`
- thumbnail path is saved to `Photo.thumbnailPath`
- guest gallery and photographer panel use thumbnail preview when available
- download endpoints still return the original file

Recommended MVP version:

```txt
upload original
-> generate thumbnail/preview image
-> save thumbnail path
-> gallery uses thumbnail
-> download uses original
```

Do not start with a Redis/BullMQ queue unless multiple app instances or durable
retry requirements become necessary. The current queue is database-status backed
and triggered by the Next.js Node.js process.

### Tethered camera upload bridge

Goal:

- support physical camera shutter workflow
- camera saves file to laptop folder
- watcher detects new file
- watcher uploads to active session
- iPad monitors photographer panel

This is future work and needs local bridge script.

### Deployment Setup

Future production/staging work:

- deploy app
- configure production env
- configure production database
- configure Supabase private bucket
- test full flow on real devices

---

## AI Agent Task Instructions

When working on this repo:

1. First understand current flow.
2. Ask for specific file if needed.
3. Prefer minimal targeted edits.
4. Provide exact file path for every change.
5. If giving code, include full file when user asks “tinggal copas”.
6. Mention migration steps when schema changes.
7. Mention restart server if env/config changes.
8. Mention manual test steps after feature changes.
9. Avoid suggesting deployment unless user asks.
10. Preserve existing working flows.

When debugging:

1. Identify if issue is env/config/code/device.
2. Check logs before changing architecture.
3. For auth issues, check:
   - NEXTAUTH_URL
   - browser URL
   - cookies
   - seed user
   - route handler
   - middleware/proxy

4. For camera issues, check:
   - HTTPS
   - browser permission
   - device selection
   - stream track label
   - video constraints

5. For storage issues, check:
   - bucket name
   - filePath
   - signed URL
   - service role key

---

## Definition of MVP Done

The MVP is considered ready when:

- vendor can login
- vendor can create event
- vendor can create photo session
- QR session works
- photographer panel opens on tablet/laptop
- camera preview works on HTTPS
- capture/upload works
- photo links to correct session
- session count/status updates correctly
- completed session blocks further upload
- guest can scan QR
- guest sees only their session photos
- guest can download single photo
- guest can download ZIP
- secure preview works
- secure download works
- bucket is private
- no critical auth/storage/camera bugs remain

---

## Notes for Future Maintainers

This project is optimized for photobooth event workflow, not generic photo storage.

The most important concept is:

```txt
Every photo must belong to exactly one event and one photo session.
```

Do not break photo-session isolation.

Guest access is based on `qrToken`.

Photographer panel is operational tooling for event day.

Guest gallery is the customer-facing experience.

Security should focus on:

- private bucket
- signed preview
- controlled download API
- strict relation validation
