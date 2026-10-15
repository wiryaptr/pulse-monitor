# Pulse Monitor

[![CI](https://github.com/wiryaptr/pulse-monitor/actions/workflows/ci.yml/badge.svg)](https://github.com/wiryaptr/pulse-monitor/actions/workflows/ci.yml)

Dashboard untuk memantau CPU, RAM, dan disk server secara langsung dari browser. API Python membaca metrik dengan psutil, FastAPI menyiarkannya lewat SSE, dan React menampilkannya sebagai bar teks, grafik garis, dan terminal yang bisa diketik.

## Cara kerja

    psutil  ->  FastAPI /stream (SSE, 2 detik)  ->  EventSource  ->  React

- Satu loop sampling bersama di API, jadi biaya baca metrik tidak naik per penonton.
- Jumlah koneksi `/stream` dibatasi (`MAX_STREAMS`) supaya aman kalau dibuka publik.
- Riwayat 60 pembacaan terakhir disimpan di memori browser, tanpa database.
- Sampler tidak mati kalau satu pembacaan gagal: errornya dicatat di log, data lama dipertahankan, dan `/health` berubah menjadi 503 kalau data sudah basi.
- Frontend menampilkan status koneksi (terhubung, menyambung ulang, data lama) dan menyambung ulang sendiri dengan jeda bertahap, termasuk saat server menolak koneksi (503).
- psutil membaca lingkungan tempat prosesnya berjalan, jadi angka dari dalam container bisa berbeda dari host (lihat Keterbatasan metrik di container).

## Struktur

    api/        FastAPI (main.py), tes (tests/: endpoint, sampler, SSE), Containerfile
    frontend/   Vite + React 19 + Recharts, Containerfile, Caddyfile
      src/components/   Terminal, StatusView, About, dll
      src/hooks.js      useMetrics, useTyper, useTheme, dll (tesnya: hooks.test.js)
      src/themes.js     13 tema warna
    scripts/    smoke-containers.sh (build dan uji container)
    compose.yaml, .env.example   menjalankan api dan web sekaligus
    .github/workflows/ci.yml     CI

## Menjalankan (pengembangan)

Backend, di folder `api`:

    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements-dev.txt
    uvicorn main:app --reload

Frontend, di terminal lain, di folder `frontend`:

    npm install
    npm run dev

Buka `http://localhost:5173`.

## Menjalankan dengan compose

Cara paling singkat untuk menyalakan api dan web sekaligus:

    podman compose up -d --build

(atau `docker compose up -d --build`). Buka `http://localhost:8080`. Perintah lain:

    podman compose ps
    podman compose logs -f api
    podman compose down

Hanya web yang membuka port, dan secara bawaan hanya dari mesin ini (`127.0.0.1`), karena dashboard belum punya autentikasi. API hanya terjangkau lewat `/api` di web. Untuk mengubah port, interval, dan lainnya, salin `.env.example` menjadi `.env`. Healthcheck didefinisikan di `compose.yaml` karena Podman mengabaikan `HEALTHCHECK` di image berformat OCI.

## Container (Podman atau Docker)

Dua image: `api/Containerfile` (FastAPI, jalan sebagai user non-root, ada healthcheck) dan `frontend/Containerfile` (hasil build Vite disajikan Caddy di port 8080, `/api` diteruskan ke container API).

Cara cepat untuk membangun, menjalankan, dan menguji semuanya:

    ENGINE=podman ./scripts/smoke-containers.sh

Tambahkan `KEEP=1` supaya container tetap hidup, lalu buka `http://localhost:8080`. Podman membuat image berformat OCI secara bawaan dan mengabaikan HEALTHCHECK, jadi build memakai `--format docker` (skrip sudah menambahkannya).

Manual:

    podman build --format docker -f api/Containerfile -t pulse-api api
    podman build --format docker -f frontend/Containerfile -t pulse-web frontend
    podman network create pulse
    podman run -d --name api --network pulse --network-alias api --read-only pulse-api
    podman run -d --name web --network pulse -p 8080:8080 --read-only --tmpfs /tmp pulse-web

Pengaturan image web: variabel `API_UPSTREAM` (bawaan `api:8000`) dan argumen build `VITE_API_URL` (bawaan `/api`).

### Keterbatasan metrik di container

psutil membaca lingkungan tempat prosesnya berjalan. Contoh hasil `scripts/smoke-containers.sh` di Fedora dengan Podman rootless (skrip yang sama mencetak perbandingan ini di mesin Anda):

| Metrik | Dari dalam container | Host |
|---|---|---|
| RAM total | 15.30 GiB | 15.30 GiB |
| Jumlah core CPU | 12 | 12 |
| Disk `/` | 58.1 GiB, terpakai 29.6% | 58.1 GiB, terpakai 30% |
| Antarmuka jaringan | `eth0`, `lo` | `lo`, `wlp2s0` |

Artinya: CPU, RAM, dan uptime adalah pembacaan host (kernel dipakai bersama). Disk `/` adalah filesystem tempat penyimpanan container berada; di mesin contoh itu kebetulan sama dengan `/` host, tetapi bisa berbeda bila penyimpanan container ada di partisi lain. Jaringan hanya menampilkan antarmuka milik container, jadi trafik host tidak terlihat. Belum diuji: `network_mode: host` untuk melihat antarmuka host, dan apakah batas memori atau CPU container (cgroup) tercermin di pembacaan.

## Konfigurasi

| Variabel | Dipakai di | Bawaan | Keterangan |
|---|---|---|---|
| `ALLOWED_ORIGINS` | API | `http://localhost:5173,http://127.0.0.1:5173` | Asal yang boleh mengakses API (pisahkan dengan koma) |
| `MAX_STREAMS` | API | `20` | Batas koneksi `/stream` bersamaan (minimal 1) |
| `PULSE_INTERVAL` | API | `2.0` | Detik antar pembacaan (minimal 0.5). Nilai yang salah membuat API menolak start |
| `VITE_API_URL` | Frontend (saat build) | `http://127.0.0.1:8000` | Alamat API. Image web memakai `/api` (lewat proxy Caddy) |
| `WEB_BIND`, `WEB_PORT` | compose (`.env`) | `127.0.0.1`, `8080` | Alamat dan port web di host. Jangan ganti `WEB_BIND` ke `0.0.0.0` sebelum ada autentikasi |

## Tes dan lint

    cd api && pytest
    cd frontend && npm run lint
    cd frontend && npm test

Semua pemeriksaan di atas, ditambah `npm run build`, smoke test container, dan uji `docker compose up`, juga jalan otomatis di GitHub Actions (`.github/workflows/ci.yml`) pada setiap push ke `main` dan setiap pull request: backend di Python 3.14, frontend di Node 22.22.2.

## Endpoint

| Endpoint | Isi |
|---|---|
| `GET /health` | `200` kalau sampler masih menghasilkan data baru, `503` kalau data basi (lebih dari 3x interval) atau belum ada |
| `GET /metrics` | Satu pembacaan terakhir (bentuk di bawah), `503` kalau belum ada |
| `GET /stream` | Aliran SSE, satu event per pembacaan dengan bentuk yang sama dengan `/metrics`. `503` kalau koneksi penuh |

Bentuk data (`/metrics` dan tiap event `/stream`):

    {
      "ts": "2026-10-14T00:03:49Z",     UTC, dibuat server saat membaca
      "interval_s": 2.0,                jeda antar pembacaan
      "host": { "hostname": "vm", "uptime_s": 411 },
      "cpu":    { "percent": 0.0 },     semua persen 0 sampai 100
      "memory": { "percent": 8.2 },
      "disk":   { "mount": "/", "percent": 48.9 }
    }

## Rencana

- Pemindaian dependensi dan image container di CI
- Deploy ke VPS dengan HTTPS (Caddy)
- Alert Telegram saat CPU tinggi
