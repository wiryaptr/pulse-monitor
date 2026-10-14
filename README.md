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
- psutil membaca lingkungan tempat prosesnya berjalan, jadi angka dari dalam container bisa berbeda dari host (lihat bagian Container).

## Struktur

    api/        FastAPI (main.py), tes (tests/: endpoint, sampler, SSE), Containerfile
    frontend/   Vite + React 19 + Recharts, Containerfile, Caddyfile
    scripts/    smoke-containers.sh (build dan uji container)
      src/components/   Terminal, StatusView, About, dll
      src/hooks.js      useMetrics, useTyper, useTheme, dll (tesnya: hooks.test.js)
      src/themes.js     13 tema warna

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

Keterbatasan metrik: psutil membaca lingkungan tempat prosesnya berjalan, jadi angka dari dalam container tidak selalu sama dengan host (misalnya disk `/` dan antarmuka jaringan). Skrip smoke mencetak perbandingan pembacaan psutil di container dengan host supaya perbedaannya terlihat di mesin Anda.

## Konfigurasi

| Variabel | Dipakai di | Bawaan | Keterangan |
|---|---|---|---|
| `ALLOWED_ORIGINS` | API | `http://localhost:5173,http://127.0.0.1:5173` | Asal yang boleh mengakses API (pisahkan dengan koma) |
| `MAX_STREAMS` | API | `20` | Batas koneksi `/stream` bersamaan (minimal 1) |
| `PULSE_INTERVAL` | API | `2.0` | Detik antar pembacaan (minimal 0.5). Nilai yang salah membuat API menolak start |
| `VITE_API_URL` | Frontend (saat build) | `http://127.0.0.1:8000` | Alamat API, misalnya `/api` di belakang nginx |

## Tes dan lint

    cd api && pytest
    cd frontend && npm run lint
    cd frontend && npm test

Semua pemeriksaan di atas, ditambah `npm run build` dan smoke test container, juga jalan otomatis di GitHub Actions (`.github/workflows/ci.yml`) pada setiap push ke `main` dan setiap pull request: backend di Python 3.14, frontend di Node 22.22.2.

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

- `compose` untuk menjalankan api dan web sekaligus
- Pemindaian dependensi dan image container di CI
- Deploy ke VPS dengan HTTPS (Caddy)
- Alert Telegram saat CPU tinggi
