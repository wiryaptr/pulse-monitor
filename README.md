# Pulse Monitor

Dashboard untuk memantau CPU, RAM, dan disk server secara langsung dari browser. API Python membaca metrik dengan psutil, FastAPI menyiarkannya lewat SSE, dan React menampilkannya sebagai bar teks, grafik garis, dan terminal yang bisa diketik.

## Cara kerja

    psutil  ->  FastAPI /stream (SSE, 2 detik)  ->  EventSource  ->  React

- Satu loop sampling bersama di API, jadi biaya baca metrik tidak naik per penonton.
- Jumlah koneksi `/stream` dibatasi (`MAX_STREAMS`) supaya aman kalau dibuka publik.
- Riwayat 60 pembacaan terakhir disimpan di memori browser, tanpa database.
- Di dalam container, nilai disk yang terbaca milik container, bukan milik host.

## Struktur

    api/        FastAPI (main.py) dan tes (tests/)
    frontend/   Vite + React 19 + Recharts
      src/components/   Terminal, StatusView, About, dll
      src/hooks.js      useMetrics, useTyper, useTheme, dll
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

## Konfigurasi

| Variabel | Dipakai di | Bawaan | Keterangan |
|---|---|---|---|
| `ALLOWED_ORIGINS` | API | `http://localhost:5173,http://127.0.0.1:5173` | Asal yang boleh mengakses API (pisahkan dengan koma) |
| `MAX_STREAMS` | API | `20` | Batas koneksi `/stream` bersamaan |
| `VITE_API_URL` | Frontend (saat build) | `http://127.0.0.1:8000` | Alamat API, misalnya `/api` di belakang nginx |

## Tes dan lint

    cd api && pytest
    cd frontend && npm run lint

## Endpoint

| Endpoint | Isi |
|---|---|
| `GET /health` | Cek hidup |
| `GET /metrics` | Satu pembacaan terakhir (`cpu`, `ram`, `disk`) |
| `GET /stream` | Aliran SSE, satu event tiap 2 detik |

## Rencana

- Container (Podman) dan `compose`
- GitHub Actions: lint, tes, build
- Deploy ke VPS dengan HTTPS (Caddy)
- Alert Telegram saat CPU tinggi
