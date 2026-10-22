// Garis kecil tanpa library. Skala vertikal tetap 0-100 supaya antar kartu bisa dibandingkan.
export default function Sparkline({ values, color }) {
  const n = values.length;
  const pts = values.map((v, i) => `${n > 1 ? (i / (n - 1)) * 100 : 100},${100 - Math.min(100, Math.max(0, v))}`);
  return (
    <svg className="spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {n > 1 && (
        <>
          <polygon points={`0,100 ${pts.join(" ")} 100,100`} fill={color} opacity="0.14" />
          <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  );
}
