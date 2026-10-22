import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_POINTS } from "./config";
import { useMetrics } from "./hooks";
import { FakeES, last, snap } from "./testUtils";

const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  FakeES.instances = [];
  vi.stubGlobal("EventSource", FakeES);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useMetrics", () => {
  it("connecting -> connected, lalu menyimpan snapshot dan riwayat", () => {
    const { result } = renderHook(() => useMetrics());
    expect(result.current.status).toBe("connecting");
    expect(last().url.endsWith("/stream")).toBe(true);

    act(() => last().open());
    expect(result.current.status).toBe("connected");

    act(() => last().message(snap(42)));
    expect(result.current.metrics.cpu.percent).toBe(42);
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject({ ts: "2026-10-14T10:00:00Z", cpu: 42, ram: 20, disk: 30 });
  });

  it("membatasi riwayat sebanyak MAX_POINTS", () => {
    const { result } = renderHook(() => useMetrics());
    act(() => last().open());
    for (let i = 0; i < MAX_POINTS + 5; i++) act(() => last().message(snap(i % 100)));
    expect(result.current.history).toHaveLength(MAX_POINTS);
  });

  it("mengabaikan event yang rusak atau bentuknya salah", () => {
    const { result } = renderHook(() => useMetrics());
    act(() => last().open());
    act(() => last().message("bukan json"));
    act(() => last().message({ cpu: 1, ram: 2, disk: 3 })); // bentuk lama
    expect(result.current.metrics).toBeNull();
    expect(result.current.history).toHaveLength(0);
    expect(result.current.status).toBe("connected");
  });

  it("menjadi stale setelah 3x interval tanpa event, lalu pulih saat event datang", () => {
    const { result } = renderHook(() => useMetrics());
    act(() => last().open());
    act(() => last().message(snap(10)));

    advance(5000);
    expect(result.current.status).toBe("connected"); // 5 dtk < 6 dtk
    advance(2000);
    expect(result.current.status).toBe("stale");

    act(() => last().message(snap(11)));
    expect(result.current.status).toBe("connected");
  });

  it("memakai interval dari server untuk batas stale", () => {
    const { result } = renderHook(() => useMetrics());
    act(() => last().open());
    act(() => last().message(snap(10, { interval_s: 10 })));
    advance(25000);
    expect(result.current.status).toBe("connected"); // batasnya 30 dtk
    advance(6000);
    expect(result.current.status).toBe("stale");
  });

  it("saat dijeda, event diabaikan tetapi koneksi tidak dianggap stale", () => {
    const { result } = renderHook(() => useMetrics());
    act(() => last().open());
    act(() => last().message(snap(10)));
    act(() => result.current.setPaused(true));

    advance(5000);
    act(() => last().message(snap(99)));
    advance(5000);
    expect(result.current.status).toBe("connected"); // 10 dtk sejak event pertama, tapi event saat dijeda tetap dihitung
    act(() => last().message(snap(98)));

    expect(result.current.metrics.cpu.percent).toBe(10);
    expect(result.current.history).toHaveLength(1);
    expect(result.current.status).toBe("connected");
  });

  it("error saat CLOSED (misalnya 503): reconnecting, lalu sambung ulang sendiri", () => {
    const { result } = renderHook(() => useMetrics());
    const first = last();
    act(() => first.open());
    act(() => first.fail(FakeES.CLOSED));

    expect(result.current.status).toBe("reconnecting");
    expect(first.closed).toBe(true);
    advance(999);
    expect(FakeES.instances).toHaveLength(1);
    advance(1);
    expect(FakeES.instances).toHaveLength(2);

    act(() => last().open());
    expect(result.current.status).toBe("connected");
  });

  it("error saat CONNECTING: browser mencoba sendiri, tidak dibuat koneksi baru", () => {
    const { result } = renderHook(() => useMetrics());
    act(() => last().fail(FakeES.CONNECTING));
    expect(result.current.status).toBe("reconnecting");
    advance(60000);
    expect(FakeES.instances).toHaveLength(1);

    act(() => last().open());
    expect(result.current.status).toBe("connected");
  });

  it("jeda sambung ulang naik dua kali lipat, dibatasi 30 dtk, dan kembali ke 1 dtk setelah berhasil", () => {
    renderHook(() => useMetrics());
    let count = 1;
    for (const ms of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
      act(() => last().fail(FakeES.CLOSED));
      advance(ms - 1);
      expect(FakeES.instances).toHaveLength(count);
      advance(1);
      count += 1;
      expect(FakeES.instances).toHaveLength(count);
    }
    act(() => last().open());
    act(() => last().fail(FakeES.CLOSED));
    advance(1000);
    expect(FakeES.instances).toHaveLength(count + 1);
  });

  it("unmount menutup koneksi dan membatalkan sambung ulang yang tertunda", () => {
    const { unmount } = renderHook(() => useMetrics());
    const first = last();
    act(() => first.fail(FakeES.CLOSED));
    unmount();
    advance(60000);
    expect(FakeES.instances).toHaveLength(1);
    expect(first.closed).toBe(true);
  });
});
