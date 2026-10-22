import { API_URL } from "../config";
import { fmtTime } from "../data";

// Pesan di atas halaman saat koneksi tidak sehat. Tidak tampil kalau terhubung.
export default function ConnectionBanner({ status, lastTs }) {
  if (status === "connected") return null;
  const last = lastTs ? ` Angka di bawah adalah pembacaan terakhir (${fmtTime(lastTs)}).` : "";
  const text = {
    connecting: "Menyambung ke API…",
    reconnecting: `Koneksi ke ${API_URL} terputus, mencoba lagi. Pastikan API berjalan.${last}`,
    stale: `Tidak ada data baru${lastTs ? ` sejak ${fmtTime(lastTs)}` : ""}. Angka di bawah diredupkan karena bisa sudah usang.`,
  }[status];
  const tone = status === "reconnecting" ? "bad" : "warn";
  return <div className={`banner ${tone}`} role="status">{text}</div>;
}
