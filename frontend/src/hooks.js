import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { API_URL, MAX_POINTS, REDUCED, RECONNECT_MAX_MS, RECONNECT_MIN_MS, STALE_FACTOR } from "./config";
import { isSnapshot, toPoint } from "./data";
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

// Menyambung ke /stream. status: connecting | connected | reconnecting | stale
export function useMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [paused, setPausedState] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    let es = null;
    let retry = null;
    let delay = RECONNECT_MIN_MS;
    let current = "connecting";
    let lastEvent = Date.now();
    let staleAfter = STALE_FACTOR * 2000;

    const set = (next) => {
      if (current === next) return;
      current = next;
      setStatus(next);
    };

    const connect = () => {
      const source = new EventSource(`${API_URL}/stream`);
      es = source;
      source.onopen = () => {
        delay = RECONNECT_MIN_MS;
        lastEvent = Date.now();
        set("connected");
      };
      source.onmessage = (e) => {
        lastEvent = Date.now(); // dihitung walau sedang dijeda, supaya tidak dianggap lama
        let data;
        try { data = JSON.parse(e.data); } catch { return; }
        if (!isSnapshot(data)) return;
        staleAfter = STALE_FACTOR * data.interval_s * 1000;
        set("connected");
        if (pausedRef.current) return;
        setMetrics(data);
        setHistory((p) => [...p, toPoint(data)].slice(-MAX_POINTS));
      };
      source.onerror = () => {
        set("reconnecting");
        // CLOSED berarti browser menyerah (misalnya server membalas 503), jadi kita sambung ulang sendiri.
        // CONNECTING berarti browser sedang mencoba lagi sendiri.
        if (source.readyState === EventSource.CLOSED) {
          source.close();
          retry = setTimeout(connect, delay);
          delay = Math.min(delay * 2, RECONNECT_MAX_MS);
        }
      };
    };

    connect();
    const watchdog = setInterval(() => {
      if (current === "connected" && Date.now() - lastEvent > staleAfter) set("stale");
    }, 1000);

    return () => {
      clearTimeout(retry);
      clearInterval(watchdog);
      es.close();
    };
  }, []);

  const setPaused = (v) => {
    pausedRef.current = v;
    setPausedState(v);
  };
  return { metrics, history, setHistory, status, paused, setPaused };
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
