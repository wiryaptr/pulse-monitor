import { fmtTime, fmtUptime } from "../data";

export default function SystemInfo({ metrics, count, stale = false }) {
  const rows = metrics
    ? [
        ["Host", metrics.host.hostname],
        ["Uptime", fmtUptime(metrics.host.uptime_s)],
        ["Disk dipantau", metrics.disk.mount],
        ["Interval", `${metrics.interval_s} detik`],
        ["Data terakhir", fmtTime(metrics.ts)],
        ["Riwayat", `${count} pembacaan`],
      ]
    : [];
  return (
    <section className={`card${stale ? " old" : ""}`} aria-label="Informasi sistem">
      <header className="card-head"><h2>Sistem</h2></header>
      {metrics ? (
        <dl className="dl">
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      ) : <p className="dim">Menunggu data pertama…</p>}
    </section>
  );
}
