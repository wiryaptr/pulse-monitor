// Alamat API. Di build produksi diisi lewat VITE_API_URL (misalnya /api di belakang nginx).
export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
export const REPO = "https://github.com/wiryaptr/pulse-monitor";
export const MAX_POINTS = 60;
export const REDUCED =
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
