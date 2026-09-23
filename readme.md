- **Process manager:** native `child_process` + cgroups v2 (when available)
- **Panel UI:** dark, responsive, no build step

---

## Requirements

- Linux VPS (Ubuntu 20.04+/Debian 11+ recommended)
- Node.js **>= 18.17**
- Root (for install) or a dedicated user with permission to write the install directory
- Optional: cgroups v2 for real resource limits

---

## Installation

```bash
git clone https://github.com/guritadarattt/panel gurita-panel
cd gurita-panel
sudo GURITA_SRC=$PWD bash scripts/install.sh
🐙 Gurita Panel
<div align="center">
A modern, lightweight VPS management panel — no Docker, no SQL, no bloat.

Inspired by Pterodactyl, rebuilt from scratch on pure Node.js.

https://img.shields.io/badge/Node.js-%E2%89%A518.17-339933?logo=node.js&logoColor=white
https://img.shields.io/badge/License-MIT-blue.svg
https://img.shields.io/badge/Platform-Linux-FCC624?logo=linux&logoColor=black
https://img.shields.io/badge/Docker-not%20required-2496ED?logo=docker&logoColor=white
https://img.shields.io/badge/Database-JSON-000000?logo=json&logoColor=white

</div>
✨ Kenapa Gurita Panel?
Fitur	Deskripsi
🚀	Zero dependencies runtime	Tidak butuh Docker, MySQL, Redis, atau message broker
📦	Install dalam 60 detik	git clone → npm install → node server.js
🎨	Theme engine	Ganti tampilan panel via CSS themes — upload zip atau import dari GitHub
🖥️	PTY shell interaktif	Terminal asli per-server, ephemeral (hidup hanya saat browser terbuka)
🎵	Background & Music	Admin bisa set background foto/video + playlist, muncul otomatis di semua halaman
🔒	Hardened by default	Helmet CSP, CSRF, rate limit, bcrypt, audit log
📊	Real resource limits	cgroups v2 untuk RAM, CPU, PIDs — verifikasi jujur, bukan sekadar angka di JSON
🌐	Port allocation	Auto-assign port unik, inject via env PORT ke proses server
🎯	Role-based access	Admin, Reseller, User — granular permission di backend
🇮🇩	Made in Indonesia	Dengan ❤️ dari Gurita Darat
🏗️ Arsitektur
text
┌──────────────────────────────────────────────────────────────┐
│                       Browser (User)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Login UI   │  │  Dashboard   │  │  Admin Console   │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│         │              │                     │              │
│         └──────────────┼─────────────────────┘              │
│                        │                                     │
│              HTTP(S) + WebSocket                             │
└────────────────────────┼─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                    Gurita Panel (Node.js)                    │
│                                                              │
│   ┌──────────────┐    ┌──────────────┐   ┌──────────────┐  │
│   │   Express    │    │  WebSocket   │   │  Auth + RBAC │  │
│   │   REST API   │    │  Console/PTY │   │   Sessions   │  │
│   └──────┬───────┘    └──────┬───────┘   └──────┬───────┘  │
│          │                   │                  │           │
│   ┌──────▼───────────────────▼──────────────────▼───────┐  │
│   │              Services Layer                          │  │
│   │  User · Server · File · Allocation · Theme · Media  │  │
│   └──────┬───────────────────┬──────────────────┬───────┘  │
│          │                   │                  │           │
│   ┌──────▼───────┐    ┌──────▼───────┐   ┌─────▼───────┐  │
│   │ JSON Store   │    │  Process Mgr │   │  cgroups v2 │  │
│   │ atomic write │    │  + node-pty  │   │  (opsional) │  │
│   └──────────────┘    └──────┬───────┘   └─────────────┘  │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   VPS Host (Linux)  │
                    │  spawn: node/python │
                    │  /bin/bash (PTY)    │
                    └─────────────────────┘
🎯 Fitur Inti
👑 Admin Panel
User Management — tambah, ubah role, suspend/ban, hapus user

Server Management — buat server (pilih owner + runtime + resource), suspend, hapus

Panel Settings — nama panel, logo custom, pesan suspend

Appearance — background foto/video, playlist music, opacity & blur

Theme — aktifkan tema, upload zip, import langsung dari GitHub

Audit Log — 100 aktivitas terakhir dengan filter user & action

👤 User Dashboard
Lihat server milik sendiri (admin tidak bisa lihat server user lain kecuali admin)

Console — stdout/stderr real-time via WebSocket

Shell — terminal bash interaktif (butuh node-pty)

File Manager — klik kanan untuk rename/delete/zip, drag & drop upload

Resources — monitor CPU, RAM, disk real-time

Allocations — lihat port yang di-assign, tersedia sebagai env PORT

🎨 Kustomisasi
CSS Themes — override variabel warna, upload via zip

GitHub Import — paste URL repo, panel otomatis download & extract

Background — JPG/PNG/WebP/GIF (foto) atau MP4/WebM (video)

Music Player — mini player floating, draggable, playlist otomatis

🚀 Instalasi Cepat
Syarat
Item	Versi	Wajib?
Linux VPS	Ubuntu 20.04+, Debian 11+, atau yang setara	✅ Wajib
Node.js	≥ 18.17	✅ Wajib
Root atau sudo	—	✅ Wajib untuk install
Build tools	build-essential (untuk node-pty)	⚠️ Opsional
cgroups v2	Kernel 4.15+	⚠️ Opsional
One-liner install
bash
git clone https://github.com/guritadarattt/panel gurita-panel
cd gurita-panel
sudo GURITA_SRC=$PWD bash scripts/install.sh
Installer akan:

✅ Cek OS dan versi Node.js

✅ Copy project ke /opt/gurita-panel

✅ Buat .env dengan SESSION_SECRET acak

✅ Install dependencies (npm install)

✅ Deteksi cgroups v2 dan systemd

✅ Buat admin pertama (password tidak akan di-echo)

Jalankan
bash
cd /opt/gurita-panel
node server.js
Buka browser: http://<ip-vps>:3000

Login pakai akun admin yang dibuat saat install.

📖 Cara Pakai
1️⃣ Login pertama
bash
# Kalau belum buat admin saat install:
node scripts/create-admin.js
2️⃣ Buat user
Admin → User Management → + New User

Isi: username, email, password (min 8 karakter), role.

3️⃣ Buat server
Admin → Server Management → + New Server

Isi:

Nama server — mis. Bot Discord

Owner — pilih dari dropdown user

Runtime — node, python3, java, php, dll.

Startup command — mis. node index.js

Resource — RAM (MB), CPU (%), Disk (MB), PIDs

4️⃣ Upload source code
User login → buka server → tab Files → Upload

Atau via shell:

bash
# Di tab Shell server
git clone https://github.com/user/repo.git .
npm install
5️⃣ Start server
Klik Start di dashboard atau di halaman server. Console akan menampilkan output real-time.

6️⃣ Akses port
Port yang di-assign otomatis tersedia sebagai env PORT:

javascript
// index.js
app.listen(process.env.PORT, () => {
  console.log('Listening on ' + process.env.PORT);
});
⚙️ Konfigurasi
.env
env
PORT=3000
HOST=127.0.0.1
NODE_ENV=production

SESSION_SECRET=<64+ karakter random>

DATABASE_PATH=./database
STORAGE_PATH=./storage
SERVER_ROOT=./storage/servers

SESSION_TTL_HOURS=24
SESSION_COOKIE_NAME=gurita_sid

ALLOW_REGISTRATION=false
TRUST_PROXY=false

LOGIN_RATE_WINDOW_MIN=10
LOGIN_RATE_MAX_ATTEMPTS=8

ENABLE_CGROUPS=true
CGROUP_ROOT=/sys/fs/cgroup/gurita-panel
Field penting
Field	Deskripsi
SESSION_SECRET	Wajib di production. Generate dengan openssl rand -hex 32
HOST	127.0.0.1 kalau di belakang reverse proxy, 0.0.0.0 kalau akses langsung
TRUST_PROXY	Set true kalau pakai Nginx/Caddy/Cloudflare
ENABLE_CGROUPS	Set false kalau VPS tidak support cgroups
🔒 Keamanan
Layer	Implementasi
Password	bcrypt 12 rounds
Session	Token random 32-byte, hash SHA-256 di server
CSRF	Double-submit cookie
XSS	Helmet CSP ketat, semua script external
SQL Injection	❌ Tidak relevan — pakai JSON
Path Traversal	safeJoin + resolusi canonical + symlink check
Shell Injection	✅ spawn tanpa shell: true, allowlist executable
Rate Limit	Login 8×/10 menit, API 240×/menit
Audit	Semua aksi penting dicatat
⚠️ Limitasi yang Perlu Diketahui
Kami jujur soal ini:

Fitur	Realita
Disk quota	❌ Soft limit saja — dicek saat upload, tapi tidak di-enforce OS-level
cgroups v2	⚠️ Tidak selalu tersedia di VPS container — panel akan beri tahu kalau tidak aktif
Network isolation	❌ Tidak ada rate limit network built-in
Shell sandbox	⚠️ Shell berjalan sebagai user yang sama dengan panel — bukan chroot
Multi-tenancy kuat	❌ Cocok untuk VPS single-tenant atau user saling percaya
API key	⚠️ Belum ada — pakai session cookie saja
Untuk multi-tenant asing, jalankan tiap server sebagai Linux user terpisah + bubblewrap/systemd-run.

🌐 Deployment Production
Nginx reverse proxy
nginx
server {
    listen 80;
    server_name panel.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
Lalu di .env:

env
TRUST_PROXY=true
HTTPS dengan Certbot
bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d panel.example.com
Systemd service
ini
# /etc/systemd/system/gurita-panel.service
[Unit]
Description=Gurita Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gurita-panel
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/gurita-panel/.env

[Install]
WantedBy=multi-user.target
bash
sudo systemctl daemon-reload
sudo systemctl enable --now gurita-panel
sudo systemctl status gurita-panel
🎨 Kustomisasi Panel
Buat tema CSS
Struktur folder:

text
themes/my-theme/
├── package.json
├── theme.css
└── preview.png (opsional)
package.json:

json
{
  "name": "my-theme",
  "displayName": "My Beautiful Theme",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Deskripsi tema",
  "entry": "theme.css"
}
theme.css:

css
:root {
  --bg: #0a0a1a;
  --bg-2: #12122a;
  --bg-3: #1a1a3a;
  --border: #2a2a5a;
  --text: #e0e0ff;
  --muted: #8080c0;
  --accent: #ff2bd6;
  --accent-2: #00e5ff;
  --green: #39ff14;
  --yellow: #ffe600;
  --red: #ff3860;
}
Upload via admin → Theme → 📦 Upload .zip atau 🐙 Import dari GitHub.

Variabel CSS
Variable	Fungsi
--bg, --bg-2, --bg-3	Background lapisan
--border	Garis border
--text, --muted	Warna teks
--accent	Warna tombol utama
--accent-2	Warna link
--green, --yellow, --red	Status warna
🔌 API
Semua endpoint di bawah /api. Autentikasi via cookie session.

Auth
Method	Endpoint	Deskripsi
POST	/auth/login	Login
POST	/auth/logout	Logout
GET	/auth/me	Info user login
Account
Method	Endpoint	Deskripsi
GET	/account/me	Profil user
PATCH	/account/profile	Ubah username/email
POST	/account/password	Ubah password
Servers
Method	Endpoint	Deskripsi
GET	/servers	List server milik user
POST	/servers/:id/start	Start
POST	/servers/:id/stop	Stop
POST	/servers/:id/restart	Restart
POST	/servers/:id/kill	Kill paksa
POST	/servers/:id/install	npm install
GET	/servers/:id/files	List file
POST	/servers/:id/files/upload	Upload file
GET	/servers/:id/allocations	List port
GET	/servers/:id/resources	Usage stats
Admin (require role=admin)
Method	Endpoint	Deskripsi
GET	/users	List semua user
POST	/users	Buat user
PATCH	/users/:id	Ubah user
POST	/users/:id/ban	Suspend
DELETE	/users/:id	Hapus
GET	/admin/servers	List semua server
POST	/admin/servers	Buat server
PATCH	/admin/servers/:id	Edit server
GET	/settings	Panel settings
PATCH	/settings	Ubah settings
GET	/themes	List tema
POST	/themes/upload	Upload tema
POST	/themes/import-github	Import dari GitHub
GET	/audit	Audit log
🧪 Testing
bash
npm test
Test meliputi:

Password hashing & verification

Path traversal protection

Database concurrent writes

Input validation

Session lifecycle

🐛 Troubleshooting
Cannot find module 'node-pty'
bash
sudo apt install -y build-essential python3
cd /opt/gurita-panel && npm install node-pty
SESSION_SECRET must be set
bash
cd /opt/gurita-panel
SECRET=$(openssl rand -hex 32)
sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$SECRET|" .env
Login gagal, tombol tidak bereaksi
Buka DevTools → Console. Kalau ada error CSP:

text
Refused to execute inline script
Berarti frontend pakai <script> inline. Semua script harus external (.js file).

Shell tidak bisa input (Ctrl+C, arrow key, dll.)
node-pty belum terinstall dengan benar. Cek:

bash
node -e "require('node-pty'); console.log('OK')"
Server tidak mau start: Executable "xxx" is not allowed
Runtime di luar allowlist. Yang didukung: node, python3, python, java, npm, pnpm, yarn, bun, deno, ruby, php.

cgroups tidak aktif
Cek:

bash
ls /sys/fs/cgroup/cgroup.controllers
Kalau file tidak ada → kernel tidak support cgroups v2. Panel akan beri warning, limit tetap dicatat tapi tidak di-enforce.

🗺️ Roadmap
☑ Auth + session + CSRF
☑ User & server management
☑ File manager (zip, unzip, editor)
☑ PTY shell ephemeral
☑ Port allocation
☑ Theme engine (CSS)
☑ Theme import dari GitHub
☑ Background + music player
□ 2FA (TOTP) untuk admin
□ API key dengan scope
□ Backup otomatis ke cloud (S3/Backblaze)
□ Scheduler (cron per server)
□ Notifikasi Discord/Telegram
□ Multi-bahasa (ID/EN)
🤝 Kontribusi
Pull request welcome! Untuk perubahan besar, buka issue dulu untuk diskusi.

Fork repo

Buat branch: git checkout -b fitur-keren-saya

Commit: git commit -m 'Tambah fitur keren'

Push: git push origin fitur-keren-saya

Buka Pull Request

📜 Lisensi
MIT — bebas dipakai, dimodifikasi, dan didistribusikan. Lihat LICENSE.

💖 Kredit
Dibuat dengan ☕ dan 🐙 oleh Gurita Darat.

Terinspirasi dari Pterodactyl — tapi dibangun dengan pendekatan yang berbeda: minimalis, tanpa Docker, tanpa SQL.

<div align="center">
🐙 Gurita Panel

Kelola VPS semudah bermain game.

⭐ Kalau proyek ini membantu, kasih bintang di GitHub!

</div>
