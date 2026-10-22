import ConnectionBanner from "../components/ConnectionBanner";
import LazyChart from "../components/LazyChart";
import MetricCard from "../components/MetricCard";
import SystemInfo from "../components/SystemInfo";
import { PENS, statsOf } from "../data";

export default function Overview({ metrics, history, status }) {
  const stale = !!metrics && status !== "connected";
  return (
    <>
      <ConnectionBanner status={status} lastTs={metrics?.ts} />
      <div className="grid-3">
        {PENS.map((p) => {
          const st = statsOf(history, p.key);
          const prefix = p.key === "disk" && metrics ? `${metrics.disk.mount} · ` : "";
          return (
            <MetricCard
              key={p.key} label={p.title} value={metrics ? p.pick(metrics) : null}
              values={history.map((h) => h[p.key])} color={p.color} stale={stale}
              caption={st ? `${prefix}rata-rata ${st.avg.toFixed(1)}% · maks ${st.max.toFixed(1)}%` : "menunggu data"}
            />
          );
        })}
      </div>
      <div className="grid-main">
        <section className={`card${stale ? " old" : ""}`} aria-label="Riwayat">
          <header className="card-head"><h2>Riwayat</h2><span className="dim">{history.length} pembacaan terakhir</span></header>
          <LazyChart history={history} height={260} />
        </section>
        <SystemInfo metrics={metrics} count={history.length} stale={stale} />
      </div>
    </>
  );
}
