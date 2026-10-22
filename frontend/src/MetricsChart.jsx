import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PENS } from "./data";

const tick = { fill: "var(--muted)", fontSize: 12 };

// Warna garis, sumbu, dan tooltip mengikuti tema lewat variabel CSS.
export default function MetricsChart({ history, height = 300, series = PENS.map((p) => p.key) }) {
  if (!history.length) return <div className="chart-empty" style={{ height }}>Menunggu data pertama…</div>;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={history} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={tick} stroke="var(--border)" minTickGap={40} />
          <YAxis domain={[0, 100]} tick={tick} stroke="var(--border)" unit="%" width={48} />
          <Tooltip
            contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(v, name) => [`${Number(v).toFixed(1)}%`, name]}
          />
          <Legend itemSorter={null} wrapperStyle={{ color: "var(--muted)", fontSize: 12 }} />
          {PENS.filter((p) => series.includes(p.key)).map((p) => (
            <Line key={p.key} name={p.title} type="monotone" dataKey={p.key} stroke={p.color} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
