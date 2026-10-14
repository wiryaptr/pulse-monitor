import { PENS, bar, fmtTime, fmtUptime, level } from "../data";

export default function StatusView({ metrics, stale = false }) {
  return (
    <div className={`blk${stale ? " old" : ""}`}>
      {PENS.map(({ key, label, pick }) => {
        const v = metrics ? pick(metrics) : 0;
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
      {metrics && (
        <div className="dim">
          {metrics.host.hostname} · aktif {fmtUptime(metrics.host.uptime_s)} · data {fmtTime(metrics.ts)}{stale ? " · lama" : ""}
        </div>
      )}
    </div>
  );
}
