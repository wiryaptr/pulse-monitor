import { THEME_NAMES } from "./themes";

export const PENS = [
  { key: "cpu", label: "CPU", color: "var(--primary)" },
  { key: "ram", label: "RAM", color: "var(--secondary)" },
  { key: "disk", label: "DISK", color: "var(--accent)" },
];

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
  ["Kenapa SSE", "datanya cuma searah dari server, jadi tidak perlu WebSocket, dan browser menyambung ulang sendiri kalau putus"],
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
