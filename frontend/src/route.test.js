import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useHashRoute } from "./hooks";

const IDS = ["overview", "metrics", "about"];
const go = (hash) => act(() => {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
});

beforeEach(() => { window.location.hash = ""; });
afterEach(cleanup);

describe("useHashRoute", () => {
  it("memakai halaman pertama bila hash kosong", () => {
    const { result } = renderHook(() => useHashRoute(IDS));
    expect(result.current).toBe("overview");
  });

  it("membaca hash awal", () => {
    window.location.hash = "#/metrics";
    const { result } = renderHook(() => useHashRoute(IDS));
    expect(result.current).toBe("metrics");
  });

  it("hash yang tidak dikenal jatuh ke halaman awal", () => {
    window.location.hash = "#/tidak-ada";
    const { result } = renderHook(() => useHashRoute(IDS));
    expect(result.current).toBe("overview");
  });

  it("mengikuti perubahan hash (tombol back dan forward browser)", () => {
    const { result } = renderHook(() => useHashRoute(IDS));
    go("#/about");
    expect(result.current).toBe("about");
    go("#/metrics");
    expect(result.current).toBe("metrics");
    go("#/ngawur");
    expect(result.current).toBe("overview");
  });

  it("berhenti mendengarkan setelah unmount", () => {
    const { result, unmount } = renderHook(() => useHashRoute(IDS));
    unmount();
    go("#/about");
    expect(result.current).toBe("overview");
  });
});
