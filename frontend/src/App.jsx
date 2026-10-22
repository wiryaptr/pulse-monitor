import { useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { ROUTES } from "./data";
import { useHashRoute, useMetrics, useTheme } from "./hooks";
import About from "./pages/About";
import Console from "./pages/Console";
import Metrics from "./pages/Metrics";
import Overview from "./pages/Overview";
import "./App.css";

const IDS = ROUTES.map((r) => r.id);
const go = (id) => { window.location.hash = `#/${id}`; };

export default function App() {
  const { metrics, history, setHistory, status, paused, setPaused } = useMetrics();
  const [theme, setTheme] = useTheme();
  const route = useHashRoute(IDS);
  const mainRef = useRef(null);
  const firstRender = useRef(true);
  const label = ROUTES.find((r) => r.id === route).label;

  // Judul tab mengikuti halaman. Setelah pindah halaman, fokus ke konten supaya pembaca layar ikut pindah.
  useEffect(() => {
    document.title = `${label} · Pulse Monitor`;
    if (firstRender.current) { firstRender.current = false; return; }
    document.documentElement.scrollTop = 0;
    mainRef.current?.focus({ preventScroll: true });
  }, [label]);

  const common = { metrics, history, status };
  return (
    <div className="shell">
      {/* href="#main" membuat pembaca layar dan alat uji mengenalnya sebagai skip link; preventDefault menjaga router hash */}
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Lewati ke konten
      </a>
      <Sidebar route={route} status={status} metrics={metrics} />
      <div className="main-col">
        <Topbar route={route} status={status} theme={theme} setTheme={setTheme} />
        <main id="main" ref={mainRef} tabIndex={-1}>
          {route === "overview" && <Overview {...common} />}
          {route === "metrics" && <Metrics {...common} setHistory={setHistory} paused={paused} setPaused={setPaused} />}
          {/* Console tetap terpasang (hanya disembunyikan) supaya riwayat perintahnya tidak hilang saat pindah halaman */}
          <div hidden={route !== "console"}>
            <Console {...common} setHistory={setHistory} paused={paused} setPaused={setPaused} theme={theme} setTheme={setTheme} go={go} />
          </div>
          {route === "about" && <About />}
        </main>
      </div>
    </div>
  );
}
