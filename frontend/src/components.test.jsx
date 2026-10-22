import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConnectionBanner from "./components/ConnectionBanner";
import MetricCard from "./components/MetricCard";
import Sidebar from "./components/Sidebar";
import Sparkline from "./components/Sparkline";
import SystemInfo from "./components/SystemInfo";
import Topbar from "./components/Topbar";
import { ROUTES } from "./data";
import { snap } from "./testUtils";

afterEach(cleanup);

describe("MetricCard", () => {
  const base = { label: "CPU", color: "red", values: [10, 20, 30] };

  it("menampilkan angka, status, dan atribut meter untuk pembaca layar", () => {
    const { container } = render(<MetricCard {...base} value={72.46} caption="rata-rata 50%" />);
    expect(container.querySelector(".big").textContent).toBe("72.5%");
    expect(screen.getByText("tinggi")).toBeTruthy();
    const meter = screen.getByRole("meter", { name: "CPU, persen" });
    expect(meter.getAttribute("aria-valuenow")).toBe("72");
    expect(meter.getAttribute("aria-valuetext")).toBe("72.5 persen, tinggi");
    expect(screen.getByText("rata-rata 50%")).toBeTruthy();
  });

  it("status mengikuti ambang 60 dan 80", () => {
    for (const [value, word] of [[10, "normal"], [60, "tinggi"], [80, "kritis"]]) {
      const { unmount } = render(<MetricCard {...base} value={value} />);
      expect(screen.getByText(word)).toBeTruthy();
      unmount();
    }
  });

  it("tanpa data: placeholder dan meter tanpa nilai", () => {
    const { container } = render(<MetricCard {...base} value={null} values={[]} />);
    expect(screen.getByText("menunggu")).toBeTruthy();
    expect(container.querySelector(".big").textContent).toBe("–");
    const meter = screen.getByRole("meter");
    expect(meter.getAttribute("aria-valuenow")).toBeNull();
    expect(meter.getAttribute("aria-valuetext")).toBe("menunggu data");
  });

  it("data lama: lencana peringatan, bukan warna level", () => {
    const { container } = render(<MetricCard {...base} value={10} stale />);
    expect(screen.getByText("data lama")).toBeTruthy();
    expect(container.querySelector(".badge").className).toContain("warn");
    expect(container.querySelector(".card").className).toContain("old");
  });
});

describe("ConnectionBanner", () => {
  it("tidak menampilkan apa pun saat terhubung", () => {
    const { container } = render(<ConnectionBanner status="connected" lastTs="2026-10-14T10:00:00Z" />);
    expect(container.firstChild).toBeNull();
  });

  it("menjelaskan setiap kondisi bermasalah", () => {
    const ts = "2026-10-14T10:00:00Z";
    const { rerender } = render(<ConnectionBanner status="connecting" />);
    expect(screen.getByRole("status").textContent).toContain("Menyambung");
    rerender(<ConnectionBanner status="reconnecting" lastTs={ts} />);
    expect(screen.getByRole("status").textContent).toMatch(/terputus.*pembacaan terakhir/);
    expect(screen.getByRole("status").className).toContain("bad");
    rerender(<ConnectionBanner status="stale" lastTs={ts} />);
    expect(screen.getByRole("status").textContent).toContain("Tidak ada data baru sejak");
    expect(screen.getByRole("status").className).toContain("warn");
  });
});

describe("Sidebar", () => {
  it("menandai hanya halaman aktif dengan aria-current", () => {
    render(<Sidebar route="metrics" status="connected" metrics={snap()} />);
    const nav = screen.getByRole("navigation", { name: "Navigasi utama" });
    for (const r of ROUTES) {
      const link = within(nav).getByRole("link", { name: r.label });
      expect(link.getAttribute("href")).toBe(`#/${r.id}`);
      expect(link.getAttribute("aria-current")).toBe(r.id === "metrics" ? "page" : null);
    }
  });

  it("menampilkan status koneksi dan hostname", () => {
    render(<Sidebar route="overview" status="stale" metrics={snap()} />);
    expect(screen.getByText("data lama")).toBeTruthy();
    expect(screen.getByText("vm")).toBeTruthy();
  });
});

describe("Topbar", () => {
  it("judul halaman dan pemilih tema", () => {
    const setTheme = vi.fn();
    render(<Topbar route="console" status="connected" theme="jaringan" setTheme={setTheme} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Console");
    const select = screen.getByLabelText("Tema");
    expect(select.value).toBe("jaringan");
    fireEvent.change(select, { target: { value: "nord" } });
    expect(setTheme).toHaveBeenCalledWith("nord");
  });
});

describe("SystemInfo", () => {
  it("menampilkan host, uptime, dan jumlah riwayat", () => {
    render(<SystemInfo metrics={snap()} count={12} />);
    expect(screen.getByText("vm")).toBeTruthy();
    expect(screen.getByText("1 jam 0 menit")).toBeTruthy(); // 3600 detik
    expect(screen.getByText("12 pembacaan")).toBeTruthy();
  });

  it("tanpa data: pesan tunggu", () => {
    render(<SystemInfo metrics={null} count={0} />);
    expect(screen.getByText(/Menunggu data/)).toBeTruthy();
  });
});

describe("Sparkline", () => {
  it("menggambar satu titik per nilai, dan tidak menggambar apa pun untuk satu nilai", () => {
    const { container, rerender } = render(<Sparkline values={[0, 50, 100]} color="red" />);
    expect(container.querySelector("polyline").getAttribute("points")).toBe("0,100 50,50 100,0");
    rerender(<Sparkline values={[50]} color="red" />);
    expect(container.querySelector("polyline")).toBeNull();
  });

  it("nilai di luar 0-100 dijepit", () => {
    const { container } = render(<Sparkline values={[-20, 150]} color="red" />);
    expect(container.querySelector("polyline").getAttribute("points")).toBe("0,100 100,0");
  });
});
