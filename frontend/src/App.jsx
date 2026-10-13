import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { THEME_NAMES, applyTheme, loadTheme, palette, saveTheme } from "./themes";
import MetricsChart from "./MetricsChart";
import "./App.css";

const REPO = "https://github.com/wiryaptr/pulse-monitor";
const MAX_POINTS = 60;
const DEMO = typeof window !== "undefined" && window.__PULSE_DEMO__;
const REDUCED = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const PENS = [
  { key: "cpu", label: "CPU", color: "var(--primary)" },
  { key: "ram", label: "RAM", color: "var(--secondary)" },
  { key: "disk", label: "DISK", color: "var(--accent)" },
];

const FEATURES = [
  ["Langsung", "data masuk lewat SSE, satu pembacaan tiap 2 detik"],
  ["Tiga metrik", "CPU, RAM, dan disk, dengan status normal, tinggi (60%), dan kritis (80%)"],
  ["Riwayat", "60 pembacaan terakhir digambar sebagai grafik garis dan bisa diunduh sebagai CSV"],
  ["Ringan", "tanpa database, riwayat cukup disimpan di memori browser"],
  ["Terminal", "ketik perintah langsung di halaman: status, graph, pause, export, dan lainnya"],
  ["Tema", `${THEME_NAMES.length} pilihan warna, ganti dengan perintah theme`],
];

const HOW = [
  ["1 baca", "API Python membaca CPU, RAM, dan disk lewat psutil"],
  ["2 siarkan", "FastAPI mengirim hasilnya lewat SSE di /stream, satu pembacaan tiap 2 detik"],
  ["3 gambar", "React menerimanya dengan EventSource, menyimpan 60 pembacaan terakhir, lalu menampilkannya sebagai bar teks dan grafik garis"],
];

const STACK = [
  ["Backend", ["Python", "psutil", "FastAPI", "uvicorn"]],
  ["Frontend", ["React", "Vite", "Recharts"]],
  ["Protokol", ["SSE", "EventSource"]],
];

const NOTES = [
  ["Kenapa SSE", "datanya cuma searah dari server, jadi tidak perlu WebSocket, dan browser menyambung ulang sendiri kalau putus"],
  ["Dua tampilan", "status berupa bar teks yang ringan, sedangkan riwayat memakai grafik garis supaya mudah dibaca"],
  ["Di container", "disk yang terbaca milik container, jadi partisi host perlu di-mount kalau mau memantau host"],
];

const HELP = [
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

const level = (v) => (v >= 80 ? ["kritis", "bad"] : v >= 60 ? ["tinggi", "warn"] : ["normal", "ok"]);
const bar = (v, w = 20) => "█".repeat(Math.round((v / 100) * w)) + "░".repeat(w - Math.round((v / 100) * w));

function useTyper(text, go) {
  const [n, setN] = useState(REDUCED ? text.length : 0);
  useEffect(() => {
    if (!go || n >= text.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 70 + Math.random() * 60);
    return () => clearTimeout(t);
  }, [go, n, text]);
  return [text.slice(0, n), n >= text.length];
}

function useInView(ref, threshold = 0.12) {
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

function Reveal({ children }) {
  const ref = useRef(null);
  const seen = useInView(ref);
  return <div ref={ref} className={`rv ${seen ? "shown" : ""}`}>{children}</div>;
}

const Ps = () => (
  <>
    <span className="usr">tamu@pulse</span><span className="dim">:</span>
    <span className="dir">~</span><span className="dim">$ </span>
  </>
);
const Line = ({ children }) => <div className="gap"><Ps />{children}</div>;

function StatusView({ metrics }) {
  return (
    <div className="blk">
      {PENS.map(({ key, label }) => {
        const v = metrics ? metrics[key] : 0;
        const [word, cls] = level(v);
        return (
          <div key={key}>
            <span className="dim">{label.padEnd(5)}</span>
            <span className={cls}>{bar(v)}</span>{" "}
            {metrics ? String(Math.round(v)).padStart(3) : "  -"}%{" "}
            <span className={cls}>{metrics ? word : "menunggu"}</span>
          </div>
        );
      })}
    </div>
  );
}

const Rows = ({ rows }) => (
  <div className="kv">
    {rows.map(([k, v]) => (
      <div key={k} style={{ display: "contents" }}><span>{k}</span><span>{v}</span></div>
    ))}
  </div>
);

const Cmds = ({ lines }) => (
  <pre className="code">{lines.map((l) => <div key={l}><span className="dim">$ </span>{l}</div>)}</pre>
);

function About() {
  return (
    <section id="about" className="wrap sec about">
      <Reveal>
        <div>
          <Line>pulse explain</Line>
          <div className="dim" style={{ marginBottom: 14 }}>psutil → FastAPI /stream → EventSource → React</div>
          <Rows rows={HOW} />
        </div>
      </Reveal>
      <Reveal>
        <div>
          <Line>pulse stack</Line>
          <div className="stack">
            {STACK.map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <span>{k}</span>
                <div>{v.map((x) => <span className="it" key={x}>{x}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
      <Reveal>
        <div>
          <Line>cat quickstart.md</Line>
          <p className="dim">Backend, di folder api:</p>
          <Cmds lines={["python3 -m venv venv", "source venv/bin/activate", 'pip install fastapi "uvicorn[standard]" psutil', "uvicorn main:app --reload"]} />
          <p className="dim">Frontend, di terminal lain:</p>
          <Cmds lines={["npm install", "npm run dev"]} />
          <p className="dim">Lalu buka localhost:5173.</p>
        </div>
      </Reveal>
      <Reveal>
        <div>
          <Line>cat notes.md</Line>
          <Rows rows={NOTES} />
        </div>
      </Reveal>
    </section>
  );
}

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState([]);
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState(loadTheme);
  const [active, setActive] = useState("home");
  const [cmd, cmdDone] = useTyper("pulse watch", true);
  const pausedRef = useRef(false);
  const past = useRef([]);
  const pos = useRef(0);
  const bodyRef = useRef(null);

  useLayoutEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const f = () => applyTheme("system");
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [theme]);

  useEffect(() => {
    const push = (data) => {
      if (pausedRef.current) return;
      setMetrics(data);
      setHistory((p) => [...p, { time: new Date().toLocaleTimeString("id-ID"), ...data }].slice(-MAX_POINTS));
    };
    if (DEMO) {
      const c = (n) => Math.max(1, Math.min(99, Math.round(n * 10) / 10));
      const step = (v) => ({ cpu: c(v.cpu + (Math.random() - 0.5) * 16), ram: c(v.ram + (Math.random() - 0.5) * 1.4), disk: 22.5 });
      let v = { cpu: 14, ram: 29, disk: 22.5 };
      const seed = [];
      for (let i = 0; i < 45; i++) { v = step(v); seed.push({ time: "", ...v }); }
      setHistory(seed); setMetrics(v); setConnected(true);
      const t = setInterval(() => { v = step(v); push(v); }, 1500);
      return () => clearInterval(t);
    }
    const es = new EventSource("http://127.0.0.1:8000/stream");
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => push(JSON.parse(e.data));
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    ["home", "about"].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [log]);

  const go = (id) => {
    if (id === "home" || id === "about") setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
  };

  const exportCSV = () => {
    const rows = ["time,cpu,ram,disk", ...history.map((h) => `${h.time},${h.cpu},${h.ram},${h.disk}`)];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    a.download = "pulse-metrics.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const run = (raw) => {
    const text = raw.trim();
    const [c, arg] = text.toLowerCase().replace(/^\//, "").split(/\s+/);
    if (!c) return;
    past.current.push(text);
    pos.current = past.current.length;
    if (c === "clear") { setLog([]); return; }
    let res;
    switch (c) {
      case "help":
        res = <div className="blk">{HELP.map(([k, d]) => <div key={k}><span className="ok">{k.padEnd(9)}</span><span className="dim">{d}</span></div>)}</div>;
        break;
      case "status":
        res = metrics ? <StatusView metrics={metrics} /> : <div className="bad">belum ada data</div>;
        break;
      case "graph":
        go("grafik");
        res = <div className="dim">membuka grafik di bawah</div>;
        break;
      case "pause":
        pausedRef.current = true; setPaused(true);
        res = <div className="warn">data masuk dijeda, ketik resume untuk lanjut</div>;
        break;
      case "resume":
        pausedRef.current = false; setPaused(false);
        res = <div className="ok">data masuk dilanjutkan</div>;
        break;
      case "reset":
        setHistory([]);
        res = <div>riwayat dikosongkan</div>;
        break;
      case "export":
        if (DEMO) res = <div className="warn">export dimatikan di pratinjau, jalan di versi lokal</div>;
        else if (!history.length) res = <div className="bad">export: riwayat kosong</div>;
        else { exportCSV(); res = <div className="ok">pulse-metrics.csv diunduh, {history.length} baris</div>; }
        break;
      case "theme":
        if (!arg) {
          res = (
            <div className="blk">
              {THEME_NAMES.map((n) => {
                const p = palette(n);
                return (
                  <div key={n}>
                    <span className={n === theme ? "ok" : "dim"}>{n === theme ? "* " : "  "}</span>{n.padEnd(21)}
                    {["primary", "secondary", "accent", "success", "warning", "error"].map((k) => <span key={k} style={{ color: p[k] }}>██</span>)}
                  </div>
                );
              })}
              <div className="dim">pakai: theme &lt;nama&gt;</div>
            </div>
          );
        } else if (THEME_NAMES.includes(arg)) {
          setTheme(arg);
          res = <div className="ok">tema diganti ke {arg}</div>;
        } else {
          res = <div className="bad">theme: tidak ada tema "{arg}". ketik theme untuk daftar.</div>;
        }
        break;
      default:
        res = <div className="bad">pulse: perintah tidak dikenal: {text}. ketik help.</div>;
    }
    setLog((l) => [...l, { id: Date.now() + Math.random(), text, res }]);
  };

  const onKey = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (pos.current > 0) { pos.current -= 1; setInput(past.current[pos.current]); }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (pos.current < past.current.length) { pos.current += 1; setInput(past.current[pos.current] ?? ""); }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const t = input.match(/^(\/?theme)\s+(\S*)$/i);
      const word = (t ? t[2] : input).toLowerCase();
      const m = (t ? THEME_NAMES : HELP.map(([k]) => k)).filter((k) => word && k.startsWith(word));
      if (m.length === 1) setInput(t ? `${t[1]} ${m[0]}` : m[0]);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLog([]);
    }
  };

  return (
    <>
      <nav className="bar">
        <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); go("home"); }}>
          <span className={`live ${connected ? "on" : ""}`} />pulse
        </a>
        <div className="tabs">
          {["home", "about"].map((id) => (
            <button key={id} className={active === id ? "on" : ""} onClick={() => go(id)}>{id}</button>
          ))}
        </div>
        <span className={`conn ${connected ? "on" : ""}`}>{connected ? (DEMO ? "simulasi" : "terhubung") : "terputus"}</span>
      </nav>

      <main className="page">
        <div id="home">
          <header className="wrap hero">
            <div className="hero-text">
              <div className="whoami"><span className="dim">$ </span>{cmd}{!cmdDone && <span className="cur" />}</div>
              {cmdDone && (
                <div className="reveal">
                  <h1>Lihat CPU, RAM, dan disk server secara langsung.</h1>
                  <p className="lead">Pulse Monitor membaca metrik mesin yang menjalankannya dan menampilkannya real-time di browser, tanpa database. Coba terminal di sebelah, ketik help untuk melihat perintahnya.</p>
                  <div className="actions">
                    <button className="btn main" onClick={() => go("fitur")}>[lihat fitur]</button>
                    <button className="btn" onClick={() => go("about")}>[cara kerja]</button>
                    {REPO && <a className="btn" href={REPO} target="_blank" rel="noreferrer">[github]</a>}
                  </div>
                </div>
              )}
            </div>

            <div className="termcard">
              <div className="termhead">
                <span>pulse-monitor</span>
                <span>{paused ? "dijeda" : connected ? (DEMO ? "data simulasi" : "live") : "terputus"}</span>
              </div>
              <div className="termbody" ref={bodyRef}>
                <div><Ps />pulse status --watch</div>
                <StatusView metrics={metrics} />
                {!connected && <div className="bad">error: tidak bisa konek ke 127.0.0.1:8000. Jalankan uvicorn di folder api.</div>}
                <div aria-live="polite">
                  {log.map(({ id, text, res }) => <div key={id}><Line>{text}</Line>{res}</div>)}
                </div>
                <form className="in" onSubmit={(e) => { e.preventDefault(); run(input); setInput(""); }}>
                  <Ps />
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
                    spellCheck="false" autoCapitalize="off" autoComplete="off" aria-label="perintah" placeholder="ketik help" />
                </form>
              </div>
            </div>
          </header>

          <section id="grafik" className="wrap sec">
            <Reveal>
              <Line>pulse graph --watch</Line>
              <div className="dim">60 pembacaan terakhir, update tiap 2 detik.</div>
              <div className="panel"><MetricsChart history={history} /></div>
            </Reveal>
          </section>

          <section id="fitur" className="wrap sec">
            <Reveal>
              <Line>pulse features</Line>
              <Rows rows={FEATURES} />
            </Reveal>
          </section>
        </div>

        <About />

        <footer className="wrap foot">
          Pulse Monitor, 2026.{REPO && <> <a href={REPO} target="_blank" rel="noreferrer">Kode di GitHub</a>.</>}
        </footer>
      </main>
    </>
  );
}