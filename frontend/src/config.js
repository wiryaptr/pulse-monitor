// Alamat API. Di build produksi diisi lewat VITE_API_URL (misalnya /api di belakang nginx).
export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
export const REPO = "https://github.com/wiryaptr/pulse-monitor";
export const MAX_POINTS = 60;
// Data dianggap lama setelah sekian kali interval server tanpa event baru.
export const STALE_FACTOR = 3;
// Jeda sambung ulang manual (naik dua kali lipat, dibatasi maksimum).
export const RECONNECT_MIN_MS = 1000;
export const RECONNECT_MAX_MS = 30000;
export const REDUCED =
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
