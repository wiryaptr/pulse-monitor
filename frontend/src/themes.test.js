import { afterEach, describe, expect, it } from "vitest";
import { THEMES, TEXT_TOKENS, contrast, derivedSurfaces, ensureContrast, makeAccessible, palette } from "./themes";

describe("kontras warna tema (WCAG AA, 4,5:1)", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    it(`${name}: semua warna teks terbaca di atas latar, panel, dan permukaan turunan`, () => {
      const t = makeAccessible(theme);
      for (const key of TEXT_TOKENS) {
        for (const bg of [t.background, t.panel, ...derivedSurfaces(t)]) {
          expect(contrast(t[key], bg), `${name}: ${key} di atas ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }

  it("warna yang sudah memenuhi syarat tidak diubah", () => {
    expect(ensureContrast("#ffffff", ["#000000"])).toBe("#ffffff");
    const t = THEMES.jaringan;
    expect(makeAccessible(t).text).toBe(t.text);
  });

  it("menggeser ke putih pada latar gelap dan ke hitam pada latar terang", () => {
    const dark = ensureContrast("#555555", ["#101010"]);
    const light = ensureContrast("#aaaaaa", ["#f0f0f0"]);
    expect(dark > "#555555").toBe(true); // lebih terang
    expect(light < "#aaaaaa").toBe(true); // lebih gelap
    expect(contrast(dark, "#101010")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light, "#f0f0f0")).toBeGreaterThanOrEqual(4.5);
  });

  it("kontras putih di atas hitam adalah 21:1", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });
});

describe("palette('system')", () => {
  const original = window.matchMedia;
  afterEach(() => { window.matchMedia = original; });

  it("memilih tema terang atau gelap sesuai preferensi OS, dan tetap lolos kontras", () => {
    for (const light of [true, false]) {
      window.matchMedia = () => ({ matches: light });
      const p = palette("system");
      for (const key of TEXT_TOKENS) expect(contrast(p[key], p.panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.background, "#000000") > contrast(p.background, "#ffffff")).toBe(light);
    }
  });
});
