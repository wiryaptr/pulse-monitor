import { describe, expect, it } from "vitest";
import { ROUTES, bar, fmtUptime, isSnapshot, level, statsOf, toPoint } from "./data";

const valid = {
  ts: "2026-10-14T10:00:00Z",
  interval_s: 2,
  host: { hostname: "vm", uptime_s: 90 },
  cpu: { percent: 5 },
  memory: { percent: 6 },
  disk: { mount: "/", percent: 7 },
};

describe("level", () => {
  it("normal di bawah 60, tinggi mulai 60, kritis mulai 80", () => {
    expect(level(59.9)[0]).toBe("normal");
    expect(level(60)[0]).toBe("tinggi");
    expect(level(80)[0]).toBe("kritis");
  });
});

describe("bar", () => {
  it("selalu selebar w karakter", () => {
    for (const v of [0, 33, 50, 100]) expect(bar(v, 20)).toHaveLength(20);
    expect(bar(0, 4)).toBe("░░░░");
    expect(bar(100, 4)).toBe("████");
  });
});

describe("fmtUptime", () => {
  it("menyesuaikan satuan", () => {
    expect(fmtUptime(90)).toBe("1 menit");
    expect(fmtUptime(3 * 3600 + 12 * 60)).toBe("3 jam 12 menit");
    expect(fmtUptime(2 * 86400 + 5 * 3600)).toBe("2 hari 5 jam");
  });
});

describe("isSnapshot", () => {
  it("menerima kontrak v1", () => expect(isSnapshot(valid)).toBe(true));
  it("menolak bentuk lama, null, dan nilai bukan angka", () => {
    expect(isSnapshot({ cpu: 1, ram: 2, disk: 3 })).toBe(false);
    expect(isSnapshot(null)).toBe(false);
    expect(isSnapshot({ ...valid, cpu: { percent: "5" } })).toBe(false);
    expect(isSnapshot({ ...valid, cpu: { percent: null } })).toBe(false);
  });
});

describe("toPoint", () => {
  it("meratakan snapshot untuk grafik dan CSV", () => {
    expect(toPoint(valid)).toMatchObject({ ts: valid.ts, cpu: 5, ram: 6, disk: 7 });
  });
});

describe("statsOf", () => {
  const h = [{ cpu: 10 }, { cpu: 30 }, { cpu: 20 }];
  it("menghitung nilai terakhir, rata-rata, minimum, dan maksimum", () => {
    expect(statsOf(h, "cpu")).toEqual({ n: 3, now: 20, avg: 20, min: 10, max: 30 });
  });
  it("riwayat kosong menghasilkan null", () => expect(statsOf([], "cpu")).toBeNull());
});

describe("ROUTES", () => {
  it("id unik dan aman dipakai di URL", () => {
    const ids = ROUTES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+$/);
  });
});
