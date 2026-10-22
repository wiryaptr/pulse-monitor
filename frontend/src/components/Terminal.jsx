import { useEffect, useRef, useState } from "react";
import { API_URL } from "../config";
import { downloadCSV } from "../csv";
import { HELP, STATUS, fmtTime } from "../data";
import { THEME_NAMES, palette } from "../themes";
import { Line, Ps } from "./Prompt";
import StatusView from "./StatusView";

export default function Terminal({ metrics, history, setHistory, status, paused, setPaused, theme, setTheme, go }) {
  const [log, setLog] = useState([]);
  const [input, setInput] = useState("");
  const past = useRef([]);
  const pos = useRef(0);
  const bodyRef = useRef(null);
  const stale = !!metrics && status !== "connected";

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [log]);

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
        res = metrics ? <StatusView metrics={metrics} stale={stale} /> : <div className="bad">belum ada data</div>;
        break;
      case "graph":
        go("metrics");
        res = <div className="dim">membuka halaman Metrics</div>;
        break;
      case "pause":
        setPaused(true);
        res = <div className="warn">data masuk dijeda, ketik resume untuk lanjut</div>;
        break;
      case "resume":
        setPaused(false);
        res = <div className="ok">data masuk dilanjutkan</div>;
        break;
      case "reset":
        setHistory([]);
        res = <div>riwayat dikosongkan</div>;
        break;
      case "export":
        if (!history.length) res = <div className="bad">export: riwayat kosong</div>;
        else { downloadCSV(history); res = <div className="ok">pulse-metrics.csv diunduh, {history.length} baris</div>; }
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
    <div className="termcard">
      <div className="termhead">
        <span>pulse-monitor{metrics ? ` · ${metrics.host.hostname}` : ""}</span>
        <span>{paused ? "dijeda" : status === "connected" ? "live" : STATUS[status][0]}</span>
      </div>
      <div className="termbody" ref={bodyRef}>
        <div><Ps />pulse status --watch</div>
        <StatusView metrics={metrics} stale={stale} />
        {status === "reconnecting" && <div className="bad">error: koneksi ke {API_URL} terputus, mencoba lagi. Pastikan uvicorn di folder api berjalan.</div>}
        {status === "stale" && metrics && <div className="warn">peringatan: tidak ada data baru sejak {fmtTime(metrics.ts)}</div>}
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
  );
}
