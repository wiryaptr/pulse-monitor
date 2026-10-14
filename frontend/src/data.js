import { THEME_NAMES } from "./themes";

export const PENS = [
  { key: "cpu", label: "CPU", color: "var(--primary)", pick: (m) => m.cpu.percent },
  { key: "ram", label: "RAM", color: "var(--secondary)", pick: (m) => m.memory.percent },
  { key: "disk", label: "DISK", color: "var(--accent)", pick: (m) => m.disk.percent },
];

// Status koneksi: [teks, kelas warna]. "on" hijau, "warn" kuning, kosong merah.
export const STATUS = {
  connecting: ["menyambung", "warn"],
  connected: ["terhubung", "on"],
  reconnecting: ["menyambung ulang", ""],
  stale: ["data lama", "warn"],
};

export const FEATURES = [
  ["Langsung", "data masuk lewat SSE, satu pembacaan tiap 2 detik"],
  ["Tiga metrik", "CPU, RAM, dan disk, dengan status normal, tinggi (60%), dan kritis (80%)"],
  ["Riwayat", "60 pembacaan terakhir digambar sebagai grafik garis dan bisa diunduh sebagai CSV"],
  ["Ringan", "tanpa database, riwayat cukup disimpan di memori browser"],
  ["Terminal", "ketik perintah langsung di halaman: status, graph, pause, export, dan lainnya"],
  ["Tema", `${THEME_NAMES.length} pilihan warna, ganti dengan perintah theme`],
];

export const HOW = [
  ["1 baca", "API Python membaca CPU, RAM, dan disk lewat psutil"],
  ["2 siarkan", "FastAPI mengirim hasilnya lewat SSE di /stream, satu pembacaan tiap 2 detik"],
  ["3 gambar", "React menerimanya dengan EventSource, menyimpan 60 pembacaan terakhir, lalu menampilkannya sebagai bar teks dan grafik garis"],
];

export const STACK = [
  ["Backend", ["Python", "psutil", "FastAPI", "uvicorn"]],
  ["Frontend", ["React", "Vite", "Recharts"]],
  ["Protokol", ["SSE", "EventSource"]],
];

export const NOTES = [
  ["Kenapa SSE", "datanya cuma searah dari server, jadi tidak perlu WebSocket. Browser menyambung ulang sendiri kalau putus, dan kalau server menolak (misalnya 503) aplikasi mencoba lagi dengan jeda bertahap"],
  ["Dua tampilan", "status berupa bar teks yang ringan, sedangkan riwayat memakai grafik garis supaya mudah dibaca"],
  ["Di container", "disk yang terbaca milik container, jadi partisi host perlu di-mount kalau mau memantau host"],
];

export const HELP = [
  ["status", "cetak pembacaan terakhir"],
  ["graph", "lompat ke grafik"],
  ["pause", "hentikan data masuk sementara"],
  ["resume", "lanjutkan data masuk"],
  ["reset", "kosongkan riwayat"],
  ["export", "unduh riwayat sebagai CSV"],
  ["theme", "ganti tema warna, contoh: theme nord"],
  ["clear", "bersihkan layar (atau Ctrl+L)"],
  ["help", "tampilkan daftar ini"],
];

export const level = (v) => (v >= 80 ? ["kritis", "bad"] : v >= 60 ? ["tinggi", "warn"] : ["normal", "ok"]);
export const bar = (v, w = 20) => "█".repeat(Math.round((v / 100) * w)) + "░".repeat(w - Math.round((v / 100) * w));

export const fmtTime = (ts) => new Date(ts).toLocaleTimeString("id-ID");

export const fmtUptime = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d} hari ${h} jam` : h ? `${h} jam ${m} menit` : `${m} menit`;
};

const num = (v) => typeof v === "number" && Number.isFinite(v);

// Pemeriksaan bentuk data dari server sebelum dipakai UI
export const isSnapshot = (s) =>
  !!s && typeof s.ts === "string" && num(s.interval_s) &&
  typeof s.host?.hostname === "string" && num(s.host?.uptime_s) &&
  num(s.cpu?.percent) && num(s.memory?.percent) && num(s.disk?.percent);

// Satu titik riwayat untuk grafik dan CSV
export const toPoint = (s) => ({
  ts: s.ts,
  time: fmtTime(s.ts),
  cpu: s.cpu.percent,
  ram: s.memory.percent,
  disk: s.disk.percent,
});
