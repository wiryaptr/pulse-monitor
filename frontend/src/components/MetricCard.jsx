import { level } from "../data";
import Sparkline from "./Sparkline";

// Satu metrik: angka besar, status, meter, dan garis riwayat. value null berarti belum ada data.
export default function MetricCard({ label, value, values, color, stale = false, caption }) {
  const has = typeof value === "number";
  const [word, tone] = has ? level(value) : ["menunggu", "dim"];
  // Data lama diberi warna peringatan, bukan warna level, supaya "data lama" berwarna hijau tidak menyesatkan
  const badgeTone = stale && has ? "warn" : tone;
  return (
    <section className={`card metric${stale ? " old" : ""}`} aria-label={label}>
      <header className="card-head">
        <h2>{label}</h2>
        <span className={`badge ${badgeTone}`}><i aria-hidden="true" />{stale && has ? "data lama" : word}</span>
      </header>
      <div className="big">{has ? <>{value.toFixed(1)}<small>%</small></> : <span className="dim">–</span>}</div>
      <div
        className="meter" role="meter" aria-label={`${label}, persen`}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={has ? Math.round(value) : undefined}
        aria-valuetext={has ? `${value.toFixed(1)} persen, ${word}` : "menunggu data"}
      >
        <span className={tone} style={{ width: `${has ? Math.min(100, Math.max(0, value)) : 0}%` }} />
      </div>
      <Sparkline values={values} color={color} />
      <div className="caption">{caption}</div>
    </section>
  );
}
