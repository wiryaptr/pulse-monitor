import { lazy, Suspense } from "react";

// Recharts adalah bagian terbesar bundle. Dimuat hanya saat halaman yang memakainya dibuka.
const MetricsChart = lazy(() => import("../MetricsChart"));

export default function LazyChart({ height = 300, ...props }) {
  return (
    <Suspense fallback={<div className="chart-empty" style={{ height }} aria-busy="true">Memuat grafik…</div>}>
      <MetricsChart height={height} {...props} />
    </Suspense>
  );
}
