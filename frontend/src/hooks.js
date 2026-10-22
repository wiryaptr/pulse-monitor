import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { API_URL, MAX_POINTS, RECONNECT_MAX_MS, RECONNECT_MIN_MS, STALE_FACTOR } from "./config";
import { isSnapshot, toPoint } from "./data";
import { applyTheme, loadTheme, saveTheme } from "./themes";

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

// Routing berbasis hash (#/overview). Tanpa library karena hanya ada empat halaman.
const routeFromHash = (ids, fallback) => {
  const id = window.location.hash.replace(/^#\/?/, "");
  return ids.includes(id) ? id : fallback;
};

export function useHashRoute(ids, fallback = ids[0]) {
  const key = ids.join(",");
  const [route, setRoute] = useState(() => routeFromHash(ids, fallback));
  useEffect(() => {
    const onChange = () => setRoute(routeFromHash(key.split(","), fallback));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [key, fallback]);
  return route;
}
