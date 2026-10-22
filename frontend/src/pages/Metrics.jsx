import { useState } from "react";
import ConnectionBanner from "../components/ConnectionBanner";
import LazyChart from "../components/LazyChart";
import { downloadCSV } from "../csv";
import { PENS, statsOf } from "../data";

export default function Metrics({ metrics, history, setHistory, status, paused, setPaused }) {
  const [shown, setShown] = useState(() => PENS.map((p) => p.key));
  // Minimal satu seri tetap tampil supaya grafik tidak kosong
  const toggle = (k) => setShown((s) => (s.includes(k) ? (s.length > 1 ? s.filter((x) => x !== k) : s) : [...s, k]));
  const stale = !!metrics && status !== "connected";
  const seconds = Math.round(history.length * (metrics?.interval_s ?? 2));

  return (
    <>
      <ConnectionBanner status={status} lastTs={metrics?.ts} />
      <section className={`card${stale ? " old" : ""}`} aria-label="Grafik riwayat">
        <div className="toolbar">
          <div className="toggles" role="group" aria-label="Seri yang ditampilkan">
            {PENS.map((p) => (
              <button key={p.key} type="button" className="toggle" aria-pressed={shown.includes(p.key)} onClick={() => toggle(p.key)}>
                <i style={{ background: p.color }} aria-hidden="true" />{p.title}
              </button>
            ))}
          </div>
          <div className="tool-actions">
            <button type="button" className="btn-ui" onClick={() => setPaused(!paused)}>{paused ? "Lanjutkan" : "Jeda"}</button>
            <button type="button" className="btn-ui" onClick={() => setHistory([])} disabled={!history.length}>Kosongkan</button>
            <button type="button" className="btn-ui" onClick={() => downloadCSV(history)} disabled={!history.length}>Unduh CSV</button>
          </div>
        </div>
        {paused && <p className="warn note" role="status">Data masuk dijeda, grafik tidak bertambah.</p>}
        <LazyChart history={history} height={360} series={shown} />
      </section>

      <section className="card" aria-label="Ringkasan statistik">
        <header className="card-head">
          <h2>Ringkasan</h2>
          <span className="dim">{history.length ? `${history.length} pembacaan, sekitar ${seconds} detik` : "belum ada data"}</span>
        </header>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabel statistik, dapat digulir">
          <table>
            <thead>
              <tr><th scope="col">Metrik</th><th scope="col">Sekarang</th><th scope="col">Rata-rata</th><th scope="col">Min</th><th scope="col">Maks</th></tr>
            </thead>
            <tbody>
              {PENS.map((p) => {
                const st = statsOf(history, p.key);
                return (
                  <tr key={p.key}>
                    <th scope="row"><i className="swatch" style={{ background: p.color }} aria-hidden="true" />{p.title}</th>
                    {st
                      ? [st.now, st.avg, st.min, st.max].map((v, i) => <td key={i}>{v.toFixed(1)}%</td>)
                      : <td colSpan={4} className="dim">menunggu data</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
