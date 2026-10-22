// Riwayat sebagai CSV. Kolom waktu memakai timestamp ISO-8601 UTC dari server.
export const toCSV = (history) =>
  ["ts,cpu,ram,disk", ...history.map((h) => `${h.ts},${h.cpu},${h.ram},${h.disk}`)].join("\n");

export const downloadCSV = (history) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([toCSV(history)], { type: "text/csv" }));
  a.download = "pulse-metrics.csv";
  a.click();
  URL.revokeObjectURL(a.href);
};
