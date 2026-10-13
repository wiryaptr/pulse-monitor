import { PENS, bar, level } from "../data";

export default function StatusView({ metrics }) {
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
