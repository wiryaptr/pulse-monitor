import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { API_URL, MAX_POINTS, REDUCED } from "./config";
import { applyTheme, loadTheme, saveTheme } from "./themes";

// Mengetik teks karakter demi karakter setelah `go` bernilai true
export function useTyper(text, go) {
  const [n, setN] = useState(REDUCED ? text.length : 0);
  useEffect(() => {
    if (!go || n >= text.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 70 + Math.random() * 60);
    return () => clearTimeout(t);
  }, [go, n, text]);
  return [text.slice(0, n), n >= text.length];
}

// True begitu elemen pertama kali terlihat di layar
export function useInView(ref, threshold = 0.12) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, ref, threshold]);
  return seen;
}

// Menyambung ke /stream dan menyimpan pembacaan terakhir serta riwayatnya
export function useMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPausedState] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/stream`);
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      if (pausedRef.current) return;
      const data = JSON.parse(e.data);
      setMetrics(data);
      setHistory((p) => [...p, { time: new Date().toLocaleTimeString("id-ID"), ...data }].slice(-MAX_POINTS));
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  const setPaused = (v) => {
    pausedRef.current = v;
    setPausedState(v);
  };
  return { metrics, history, setHistory, connected, paused, setPaused };
}

// Tema warna: terapkan ke variabel CSS dan simpan pilihannya
export function useTheme() {
  const [theme, setTheme] = useState(loadTheme);
  useLayoutEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const f = () => applyTheme("system");
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [theme]);
  return [theme, setTheme];
}

// Menandai bagian halaman yang sedang di tengah layar
export function useActiveSection(ids) {
  const key = ids.join(",");
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    key.split(",").forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [key]);
  return [active, setActive];
}
