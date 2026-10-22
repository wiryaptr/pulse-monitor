import { THEME_NAMES } from "./themes";

export const PENS = [
  { key: "cpu", label: "CPU", title: "CPU", color: "var(--primary)", pick: (m) => m.cpu.percent },
  { key: "ram", label: "RAM", title: "Memori", color: "var(--secondary)", pick: (m) => m.memory.percent },
  { key: "disk", label: "DISK", title: "Disk", color: "var(--accent)", pick: (m) => m.disk.percent },
];

// Status koneksi: [teks, kelas warna]. "on" hijau, "warn" kuning, kosong merah.
export const STATUS = {
  connecting: ["menyambung", "warn"],
  connected: ["terhubung", "on"],
  reconnecting: ["menyambung ulang", ""],
  stale: ["data lama", "warn"],
};

// Halaman aplikasi. id dipakai di URL (#/overview).
export const ROUTES = [
  { id: "overview", label: "Overview", hint: "Kondisi server saat ini" },
  { id: "metrics", label: "Metrics", hint: "Riwayat dan statistik" },
  { id: "console", label: "Console", hint: "Terminal perintah" },
  { id: "about", label: "About", hint: "Cara kerja dan stack" },
];

export const FEATURES = [
  ["Langsung", "data masuk lewat SSE, satu pembacaan tiap 2 detik"],
  ["Tiga metrik", "CPU, RAM, dan disk, dengan status normal, tinggi (60%), dan kritis (80%)"],
  ["Riwayat", "60 pembacaan terakhir digambar sebagai grafik dan bisa diunduh sebagai CSV"],
  ["Ringan", "tanpa database, riwayat cukup disimpan di memori browser"],
  ["Console", "terminal di halaman: status, graph, pause, export, theme, dan lainnya"],
  ["Tema", `${THEME_NAMES.length} pilihan warna dengan kontras yang dijaga memenuhi WCAG AA`],
];

export const HOW = [
  ["1 baca", "API Python membaca CPU, RAM, dan disk lewat psutil"],
  ["2 siarkan", "FastAPI mengirim hasilnya lewat SSE di /stream, satu pembacaan tiap 2 detik"],
  ["3 gambar", "React menerimanya dengan EventSource, menyimpan 60 pembacaan terakhir, lalu menampilkannya sebagai kartu, grafik garis, dan terminal"],
];

export const STACK = [
  ["Backend", ["Python", "psutil", "FastAPI", "uvicorn"]],
  ["Frontend", ["React", "Vite", "Recharts"]],
  ["Protokol", ["SSE", "EventSource"]],
];

export const NOTES = [
  ["Kenapa SSE", "datanya cuma searah dari server, jadi tidak perlu WebSocket. Browser menyambung ulang sendiri kalau putus, dan kalau server menolak (misalnya 503) aplikasi mencoba lagi dengan jeda bertahap"],
  ["Status koneksi", "terhubung, menyambung ulang, atau data lama ditampilkan di atas halaman, dan angka lama diredupkan supaya tidak dikira terbaru"],
  ["Di container", "CPU, RAM, dan uptime adalah pembacaan host. Disk / adalah filesystem tempat penyimpanan container, dan jaringan hanya menampilkan antarmuka container. Detail dan hasil ukurnya ada di README"],
];

export const HELP = [
  ["status", "cetak pembacaan terakhir"],
  ["graph", "buka halaman Metrics"],
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

// Ringkasan satu metrik pada jendela riwayat: nilai terakhir, rata-rata, minimum, maksimum
export const statsOf = (history, key) => {
  if (!history.length) return null;
  const v = history.map((h) => h[key]);
  return {
    n: v.length,
    now: v[v.length - 1],
    avg: v.reduce((a, b) => a + b, 0) / v.length,
    min: Math.min(...v),
    max: Math.max(...v),
  };
};
