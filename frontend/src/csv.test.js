import { describe, expect, it } from "vitest";
import { toCSV } from "./csv";

describe("toCSV", () => {
  it("menulis header dan satu baris per titik, dengan timestamp ISO", () => {
    const rows = toCSV([
      { ts: "2026-10-14T10:00:00Z", cpu: 4, ram: 20.5, disk: 62.5 },
      { ts: "2026-10-14T10:00:02Z", cpu: 5, ram: 20.6, disk: 62.5 },
    ]).split("\n");
    expect(rows).toEqual([
      "ts,cpu,ram,disk",
      "2026-10-14T10:00:00Z,4,20.5,62.5",
      "2026-10-14T10:00:02Z,5,20.6,62.5",
    ]);
  });

  it("riwayat kosong hanya berisi header", () => {
    expect(toCSV([])).toBe("ts,cpu,ram,disk");
  });
});
