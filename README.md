# Photo Cloud App

## Abstract

Photo Cloud App adalah aplikasi web berbasis Next.js untuk kebutuhan photo booth event. Aplikasi ini memungkinkan vendor membuat event, membuat photo session per grup/tamu, menghasilkan QR code unik per session, mengambil foto melalui webcam atau upload file, menampilkan preview foto secara real-time di photographer panel, serta menyediakan guest gallery untuk preview dan download foto per session.

Sistem ini dirancang agar setiap foto tersimpan dan terhubung ke `PhotoSession` tertentu, sehingga guest hanya melihat foto milik session mereka sendiri. Aplikasi juga mendukung secure download, signed preview URL, session lifecycle management, dan testing lokal menggunakan Cloudflare Tunnel agar kamera dapat diakses melalui HTTPS.

**Keywords:** Photo Booth, Next.js, Prisma, Supabase Storage, NextAuth, QR Code, Cloudflare Tunnel, Photo Session, Secure Preview.

---

# I. Introduction

Photo Cloud App dibuat untuk membantu alur kerja photo booth pada sebuah event. Dalam skenario penggunaan nyata, vendor atau photographer dapat membuat event, membuka photographer panel, membuat session foto baru, menampilkan QR code untuk guest, mengambil foto, dan guest dapat mengakses hasil fotonya melalui QR code tersebut.

Aplikasi ini fokus pada alur:

```txt
Vendor Login
-> Create Event
-> Create Photo Session
-> Generate QR Code
-> Photographer Capture / Upload Photo
-> Photo linked to PhotoSession
-> Guest Scan QR
-> Guest Preview & Download Photos
````

---

# II. Project Goals

Tujuan utama project ini adalah:

1. Membuat sistem photo booth berbasis web.
2. Menghubungkan setiap foto ke event dan photo session yang benar.
3. Menyediakan QR code unik untuk setiap photo session.
4. Menampilkan gallery foto khusus per session.
5. Menyediakan photographer panel untuk monitoring session.
6. Mendukung webcam capture untuk testing dan penggunaan awal.
7. Menyediakan fitur download per foto dan download semua foto dalam bentuk ZIP.
8. Mengamankan preview dan download foto menggunakan server-side flow dan signed URL.
9. Mendukung local testing dengan HTTPS menggunakan Cloudflare Tunnel.

---

# III. Technology Stack

Project ini menggunakan teknologi berikut:

| Layer               | Technology                    |
| ------------------- | ----------------------------- |
| Frontend            | Next.js App Router            |
| Backend             | Next.js API Route             |
| Database ORM        | Prisma                        |
| Database            | PostgreSQL                    |
| Authentication      | NextAuth Credentials Provider |
| Storage             | Supabase Storage              |
| File Download       | Supabase Storage API + JSZip  |
| Image Preview       | Supabase Signed URL           |
| QR Code             | QR session URL                |
| Styling             | Tailwind CSS                  |
| Local HTTPS Testing | Cloudflare Tunnel             |
| Runtime             | Node.js                       |

---

# IV. Main Features

## 1. Authentication

Aplikasi menggunakan NextAuth dengan Credentials Provider.

Role user yang tersedia:

* `admin`
* `vendor`
* `crew`

Seeder default menyediakan akun:

```txt
admin@mail.com / admin123
vendor@mail.com / vendor123
crew@mail.com / crew123
```

## 2. Event Management

Vendor dapat membuat event dan melihat daftar event miliknya.

Data event mencakup:

* title
* slug
* description
* event date
* location
* createdById

## 3. Photo Session Management

Setiap event dapat memiliki banyak photo session.

Photo session memiliki:

* QR token unik
* target shots
* current shot count
* status
* createdById
* eventId

Status photo session:

```txt
pending
active
completed
cancelled
```

## 4. QR Code Per Session

Setiap session memiliki QR code yang mengarah ke guest gallery:

```txt
/guest/session/[qrToken]
```

Guest yang scan QR hanya akan melihat foto dari session tersebut.

## 5. Photographer Session Panel

Photographer panel digunakan untuk monitoring dan kontrol session.

Fitur panel:

* melihat QR code session
* melihat session ID dan QR token
* melihat progress foto
* melihat status session
* webcam capture
* live preview foto
* delete photo
* create next session
* cancel session
* delete empty session
* reopen cancelled session

## 6. Webcam Capture

Photographer dapat mengambil foto langsung melalui webcam/browser camera.

Fitur kamera:

* start camera
* stop camera
* capture photo
* pilih camera device
* upload hasil capture ke API `/api/upload`

Untuk penggunaan kamera di device selain localhost, halaman harus dibuka melalui HTTPS. Untuk testing lokal, gunakan Cloudflare Tunnel.

## 7. Guest Gallery

Guest gallery menampilkan foto berdasarkan QR token session.

Fitur guest gallery:

* melihat event name
* melihat progress session
* melihat foto session
* preview foto
* download per foto
* download semua foto dalam ZIP

## 8. Secure Download

Download foto tidak langsung mengambil public URL, tetapi melalui API backend.

Single photo download:

```txt
/api/guest/photo/[photoId]/download?qrToken=[qrToken]
```

Download all photos as ZIP:

```txt
/api/guest/session/[qrToken]/download
```

API akan memvalidasi:

* photo exists
* qrToken valid
* photo belongs to that session
* file diambil dari Supabase Storage menggunakan `filePath`

## 9. Secure Preview

Preview foto menggunakan Supabase Signed URL.

Tujuannya:

* guest tidak mengakses file public URL langsung
* preview hanya valid sementara
* mendukung bucket private
* lebih aman untuk production

---

# V. System Architecture

## A. High-Level Flow

```txt
User / Vendor
    |
    v
Login via NextAuth
    |
    v
Dashboard
    |
    v
Event Detail
    |
    v
Create Photo Session
    |
    v
Photographer Panel
    |
    +--> Generate QR Code
    +--> Capture / Upload Photo
    +--> Store Original Photo in Supabase
    +--> Save Photo Metadata in PostgreSQL
    +--> Update currentShotCount
    +--> Auto-complete session if target reached
    |
    v
Guest scans QR
    |
    v
Guest Gallery
    |
    +--> Signed Preview URL
    +--> Secure Single Download
    +--> Secure ZIP Download
```

## B. Storage Flow

```txt
Uploaded File
    |
    v
Supabase Storage Bucket
    |
    v
events/[eventId]/sessions/[photoSessionId]/[uniqueFileName]
    |
    v
Photo metadata saved in database
```

## C. Preview Flow

```txt
Guest / Photographer Page
    |
    v
Server generates signed preview URL
    |
    v
Browser renders signed URL
```

## D. Download Flow

```txt
Guest clicks Download
    |
    v
Next.js API validates qrToken and photo relation
    |
    v
API downloads file from Supabase using filePath
    |
    v
API returns attachment response
```

---

# VI. Database Overview

Project menggunakan Prisma ORM.

## Main Models

### User

Menyimpan data user aplikasi.

Field utama:

* id
* name
* email
* password
* role

### Event

Menyimpan data event milik vendor.

Field utama:

* id
* title
* slug
* description
* eventDate
* location
* createdById

### PhotoSession

Menyimpan data sesi foto pada event.

Field utama:

* id
* eventId
* createdById
* qrToken
* targetShots
* currentShotCount
* status
* startedAt
* completedAt

### Photo

Menyimpan metadata foto.

Field utama:

* id
* eventId
* photoSessionId
* fileName
* filePath
* fileUrl
* mimeType
* size
* uploadedAt

---

# VII. Folder Structure

Struktur folder utama project:

```txt
photo-cloud-app/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── upload/
│   │   │   └── route.ts
│   │   ├── guest/
│   │   │   ├── photo/
│   │   │   │   └── [photoId]/
│   │   │   │       └── download/
│   │   │   │           └── route.ts
│   │   │   └── session/
│   │   │       └── [qrToken]/
│   │   │           └── download/
│   │   │               └── route.ts
│   │   ├── events/
│   │   │   └── [eventId]/
│   │   │       ├── photo-sessions/
│   │   │       │   └── route.ts
│   │   │       └── photographer-panel/
│   │   │           └── route.ts
│   │   ├── photos/
│   │   │   └── [photoId]/
│   │   │       └── route.ts
│   │   └── photo-sessions/
│   │       └── [photoSessionId]/
│   │           ├── cancel/
│   │           │   └── route.ts
│   │           ├── reopen/
│   │           │   └── route.ts
│   │           └── route.ts
│   │
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── events/
│   │       └── [eventId]/
│   │           ├── page.tsx
│   │           ├── photobooth/
│   │           │   └── page.tsx
│   │           └── actions.ts
│   │
│   ├── guest/
│   │   └── session/
│   │       └── [qrToken]/
│   │           └── page.tsx
│   │
│   ├── login/
│   │   └── page.tsx
│   │
│   ├── upload-test/
│   │   └── page.tsx
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── photographer-camera-capture.tsx
│   ├── photographer-session-live-panel.tsx
│   └── photo-session-qr.tsx
│
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── supabase.ts
│   └── supabase-signed-preview.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
│
├── types/
│
├── public/
│
├── next.config.ts
├── package.json
├── docker-compose.yml
├── .env.example
├── .env.local
└── README.md
```

---

# VIII. Environment Variables

Buat file `.env.local` di root project.

Contoh konfigurasi local:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/photo_cloud_app

NEXTAUTH_SECRET=super-secret-dev-key
NEXTAUTH_URL=http://localhost:3001
APP_URL=http://localhost:3001

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=event-photos
```

## Notes

Untuk testing menggunakan Cloudflare Tunnel, ubah:

```env
NEXTAUTH_URL=https://your-tunnel.trycloudflare.com
APP_URL=https://your-tunnel.trycloudflare.com
```

Jangan commit file `.env.local` ke repository.

---

# IX. Installation

## 1. Clone Repository

```bash
git clone https://github.com/wsantika/photo-cloud-app.git
cd photo-cloud-app
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Setup Environment

Copy `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Lalu isi environment variable sesuai kebutuhan.

---

# X. Database Setup

Project menggunakan PostgreSQL.

Jika menggunakan Docker:

```bash
docker compose up -d
```

Pastikan `DATABASE_URL` sesuai dengan port database.

Contoh:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/photo_cloud_app
```

## Generate Prisma Client

```bash
npx prisma generate
```

## Run Migration

```bash
npx prisma migrate dev
```

## Run Seeder

```bash
node prisma/seed.js
```

Seeder akan membuat akun:

```txt
admin@mail.com / admin123
vendor@mail.com / vendor123
crew@mail.com / crew123
```

## Open Prisma Studio

```bash
npx prisma studio
```

Default Prisma Studio akan berjalan di:

```txt
http://localhost:5555
```

---

# XI. Supabase Storage Setup

## 1. Buat Project Supabase

Buat project baru di Supabase.

## 2. Buat Storage Bucket

Buat bucket dengan nama:

```txt
event-photos
```

Sesuaikan dengan:

```env
SUPABASE_STORAGE_BUCKET=event-photos
```

## 3. Bucket Privacy

Untuk secure preview dan secure download, disarankan bucket dibuat **private**.

Akses file dilakukan melalui:

* signed URL untuk preview
* API download untuk single photo
* API ZIP untuk download all photos

## 4. Service Role Key

Gunakan `SUPABASE_SERVICE_ROLE_KEY` hanya di server-side.

Jangan expose service role key ke client.

Jika key pernah terlihat di screenshot/public repo, segera rotate key dari Supabase Dashboard.

---

# XII. Running the Project

## Development Mode

```bash
npm run dev
```

Default Next.js biasanya berjalan di:

```txt
http://localhost:3000
```

Jika port 3000 sudah dipakai, gunakan port 3001:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Lalu set `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3001
APP_URL=http://localhost:3001
```

---

# XIII. Local Network Testing

Jika ingin membuka app dari device lain dalam jaringan lokal, jalankan:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Cari IP laptop:

```bash
ipconfig
```

Contoh IP:

```txt
192.168.1.13
```

Lalu ubah `.env.local`:

```env
NEXTAUTH_URL=http://192.168.1.13:3001
APP_URL=http://192.168.1.13:3001
```

Buka dari device lain:

```txt
http://192.168.1.13:3001
```

## Notes

Untuk akses kamera dari browser mobile/tablet, HTTP LAN biasa dapat ditolak browser karena bukan secure context. Gunakan Cloudflare Tunnel untuk mendapatkan HTTPS.

---

# XIV. Cloudflare Tunnel Testing

Cloudflare Tunnel digunakan agar app lokal bisa diakses melalui HTTPS.

Ini berguna untuk:

* testing kamera di tablet/HP
* testing QR dari device lain
* testing guest flow tanpa deploy production

## 1. Install cloudflared

Windows:

```bash
winget install --id Cloudflare.cloudflared
```

Cek instalasi:

```bash
cloudflared --version
```

## 2. Jalankan Next.js

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

## 3. Jalankan Tunnel

Di terminal lain:

```bash
cloudflared tunnel --url http://localhost:3001
```

Cloudflare akan memberikan URL seperti:

```txt
https://your-random-name.trycloudflare.com
```

## 4. Update `.env.local`

```env
NEXTAUTH_URL=https://your-random-name.trycloudflare.com
APP_URL=https://your-random-name.trycloudflare.com
```

## 5. Update `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "your-random-name.trycloudflare.com",
    "localhost",
  ],
};

export default nextConfig;
```

## 6. Restart Next.js

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

## 7. Buka App dari URL Cloudflare

```txt
https://your-random-name.trycloudflare.com/login
```

## Important Notes

Quick Tunnel bersifat sementara. Jika tunnel dihentikan, URL dapat berubah.

Jika URL berubah, update ulang:

* `NEXTAUTH_URL`
* `APP_URL`
* `allowedDevOrigins`
* restart Next.js

---

# XV. Authentication Flow

Protected route:

```txt
/dashboard/*
```

Jika user belum login dan mengakses dashboard, user akan diarahkan ke:

```txt
/login?callbackUrl=/dashboard
```

Setelah login berhasil, user akan kembali ke callback URL tersebut.

## Login Credentials

```txt
vendor@mail.com / vendor123
admin@mail.com / admin123
crew@mail.com / crew123
```

---

# XVI. Main Routes

## Public Routes

| Route                      | Description        |
| -------------------------- | ------------------ |
| `/`                        | Landing page       |
| `/login`                   | Login page         |
| `/guest/session/[qrToken]` | Guest gallery page |

## Dashboard Routes

| Route                                    | Description                |
| ---------------------------------------- | -------------------------- |
| `/dashboard`                             | Vendor dashboard           |
| `/dashboard/events/[eventId]`            | Event detail               |
| `/dashboard/events/[eventId]/photobooth` | Photographer session panel |

## API Routes

| Route                                         | Method | Description                  |
| --------------------------------------------- | ------ | ---------------------------- |
| `/api/upload`                                 | POST   | Upload/capture photo         |
| `/api/guest/photo/[photoId]/download`         | GET    | Download single photo        |
| `/api/guest/session/[qrToken]/download`       | GET    | Download all photos as ZIP   |
| `/api/events/[eventId]/photo-sessions`        | POST   | Create photo session         |
| `/api/events/[eventId]/photographer-panel`    | GET    | Poll photographer panel data |
| `/api/photos/[photoId]`                       | DELETE | Delete photo                 |
| `/api/photo-sessions/[photoSessionId]`        | DELETE | Delete empty session         |
| `/api/photo-sessions/[photoSessionId]/cancel` | POST   | Cancel session               |
| `/api/photo-sessions/[photoSessionId]/reopen` | POST   | Reopen cancelled session     |

---

# XVII. Photo Session Lifecycle

## 1. Pending

Session baru dibuat, belum ada foto.

```txt
status = pending
currentShotCount = 0
```

## 2. Active

Foto pertama berhasil diupload.

```txt
status = active
currentShotCount > 0
```

## 3. Completed

Jumlah foto sudah mencapai target shots.

```txt
status = completed
currentShotCount >= targetShots
```

## 4. Cancelled

Session dibatalkan oleh photographer/vendor.

```txt
status = cancelled
```

---

# XVIII. Upload Flow

Upload dilakukan melalui:

```txt
POST /api/upload
```

Form data:

```txt
eventId
photoSessionId
file
```

Validasi upload:

* file wajib ada
* eventId wajib ada
* photoSessionId wajib ada
* mime type harus valid
* ukuran file maksimal 10MB
* event harus ada
* photoSession harus cocok dengan event
* session tidak boleh completed
* session tidak boleh cancelled

Storage path:

```txt
events/[eventId]/sessions/[photoSessionId]/[uniqueFileName]
```

Setelah upload berhasil:

1. file masuk ke Supabase Storage
2. metadata photo disimpan ke database
3. `currentShotCount` dihitung ulang
4. status session berubah menjadi `active` atau `completed`

---

# XIX. Guest Flow

Guest membuka halaman:

```txt
/guest/session/[qrToken]
```

Sistem akan:

1. mencari `PhotoSession` berdasarkan `qrToken`
2. mengambil event dan photos terkait
3. membuat signed preview URL
4. menampilkan gallery
5. menyediakan download per foto dan ZIP

---

# XX. Photographer Flow

Photographer membuka:

```txt
/dashboard/events/[eventId]/photobooth
```

atau dengan session tertentu:

```txt
/dashboard/events/[eventId]/photobooth?sessionId=[photoSessionId]
```

Panel akan:

1. menampilkan QR code
2. menampilkan status session
3. menampilkan progress foto
4. menampilkan kamera capture
5. polling API photographer panel
6. menampilkan live preview
7. menyediakan action session

---

# XXI. Camera Testing

## Webcam Browser

Photographer panel mendukung browser webcam menggunakan `navigator.mediaDevices`.

Kamera browser membutuhkan secure context:

* `localhost` diperbolehkan
* `https://` diperbolehkan
* `http://192.168.x.x` sering ditolak

Untuk testing dengan iPad/tablet, gunakan Cloudflare Tunnel.

## Digital Camera

Untuk kamera digital fisik, opsi yang memungkinkan:

1. Gunakan app resmi kamera di iPad untuk live monitoring.
2. Gunakan HDMI capture card UVC jika ingin kamera terbaca sebagai camera device.
3. Gunakan laptop/mini PC sebagai bridge jika ingin feed kamera masuk ke web panel.

Untuk MVP saat ini, webcam/tablet camera adalah jalur paling sederhana.

---

# XXII. Security Notes

1. Jangan commit `.env.local`.
2. Jangan expose `SUPABASE_SERVICE_ROLE_KEY` ke client.
3. Gunakan private bucket untuk storage foto.
4. Gunakan signed URL untuk preview.
5. Gunakan API backend untuk download.
6. Validasi `qrToken` sebelum download single photo.
7. Pastikan foto hanya bisa diakses dari session yang benar.
8. Rotate Supabase key jika pernah terekspos di screenshot atau repository public.

---

# XXIII. Troubleshooting

## 1. Login balik terus ke `/login`

Cek:

* `NEXTAUTH_URL` sesuai dengan URL browser
* `APP_URL` sesuai dengan URL browser
* jangan campur `localhost`, IP LAN, dan Cloudflare URL
* hapus cookie lama
* restart dev server

## 2. Kamera tidak muncul

Cek:

* halaman dibuka melalui HTTPS atau localhost
* browser sudah diberi izin kamera
* device memiliki camera input
* coba refresh camera device
* gunakan Cloudflare Tunnel untuk testing di iPad/HP

## 3. QR mengarah ke URL salah

Cek:

```env
APP_URL=...
```

Restart server setelah mengubah `.env.local`.

## 4. Cross-origin blocked di Next.js dev

Tambahkan host ke `next.config.ts`:

```ts
const nextConfig = {
  allowedDevOrigins: [
    "your-host.trycloudflare.com",
    "localhost",
  ],
};

export default nextConfig;
```

## 5. Foto tidak tampil setelah bucket private

Pastikan:

* guest page menggunakan signed preview URL
* photographer panel menggunakan signed preview URL
* `SUPABASE_SERVICE_ROLE_KEY` benar
* `SUPABASE_STORAGE_BUCKET` benar
* `filePath` benar

## 6. Download ZIP gagal

Cek:

* semua photo memiliki `filePath`
* file masih ada di Supabase Storage
* bucket name benar
* API route berjalan di runtime Node.js

---

# XXIV. Development Workflow

## Create Branch

```bash
git checkout -b feat/feature-name
```

## Run Dev Server

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

## Run Prisma Studio

```bash
npx prisma studio
```

## Commit Example

```bash
git add .
git commit -m "feat: implement secure photo preview"
```

---

# XXV. MVP Checklist

Sebelum digunakan untuk event nyata, pastikan:

* [x] Login berjalan normal
* [x] Vendor bisa membuat event
* [x] Vendor bisa membuat photo session
* [x] QR code mengarah ke guest page yang benar
* [x] Photographer panel bisa membuka kamera
* [x] Capture photo berhasil
* [x] Foto masuk ke session yang benar
* [x] Live preview muncul
* [x] Guest gallery menampilkan foto session yang benar
* [x] Download per foto berhasil
* [x] Download ZIP berhasil
* [x] Delete photo berhasil
* [x] currentShotCount update dengan benar
* [x] Session completed otomatis saat target tercapai
* [x] Create next session berjalan
* [x] Cancel session berjalan
* [x] Reopen session berjalan
* [x] Delete empty session berjalan
* [x] Secure preview berjalan dengan signed URL
* [x] Supabase bucket private
* [x] Testing kamera berhasil lewat HTTPS
* [ ] Tidak ada critical bug

---

# XXVI. Future Improvements

Fitur yang dapat dikembangkan selanjutnya:

1. Background worker untuk image processing.
2. Thumbnail generation.
3. Image compression.
4. Upload progress indicator.
5. Multi-photographer support.
6. Guest authentication optional.
7. Payment/invoice integration.
8. Cloud deployment.
9. Named Cloudflare Tunnel.
10. Admin analytics dashboard.
11. Queue-based upload processing.
12. Backup original photo.
13. Watermark support.
14. Face grouping / AI tagging.
15. Custom event branding.

---

# XXVII. Conclusion

Photo Cloud App adalah sistem photo booth berbasis web yang mendukung workflow event dari sisi vendor, photographer, dan guest. Dengan dukungan QR session, secure preview, secure download, webcam capture, Supabase Storage, dan Cloudflare Tunnel untuk testing HTTPS, project ini sudah memiliki fondasi kuat untuk dikembangkan menjadi MVP yang siap diuji pada use case nyata.

Project ini masih dapat ditingkatkan melalui image processing, deployment production, dan optimasi UX, tetapi core flow photo booth sudah dirancang untuk mendukung alur kerja event secara end-to-end.

```

Catatan kecil: di bagian `.env.local`, jangan isi key asli di README. Pakai placeholder saja. Dan karena key Supabase-mu sempat kelihatan di screenshot, nanti setelah project lebih serius sebaiknya rotate `SUPABASE_SERVICE_ROLE_KEY` di Supabase Dashboard.
```
