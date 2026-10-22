import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { FakeES, last, snap } from "./testUtils";

// Recharts butuh ukuran layout yang tidak ada di jsdom, jadi grafik diganti penanda sederhana
vi.mock("./MetricsChart", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ history, series }) =>
      createElement("div", { "data-testid": "chart" }, `${history.length} titik; seri ${(series ?? []).join(",")}`),
  };
});

const goto = (hash) => act(() => {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
});
const connect = (cpu = 42) => {
  act(() => last().open());
  act(() => last().message(snap(cpu)));
};
const consoleInput = () => document.querySelector('input[aria-label="perintah"]');

beforeEach(() => {
  FakeES.instances = [];
  vi.stubGlobal("EventSource", FakeES);
  window.location.hash = "";
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("membuka Overview secara bawaan", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Overview");
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");
    expect(document.title).toBe("Overview · Pulse Monitor");
  });

  it("menampilkan data dari stream di kartu metrik", () => {
    render(<App />);
    connect(42);
    const card = screen.getByRole("region", { name: "CPU" });
    expect(within(card).getByRole("meter").getAttribute("aria-valuenow")).toBe("42");
    expect(card.textContent).toContain("42.0%");
    expect(screen.getByRole("region", { name: "Informasi sistem" }).textContent).toContain("vm");
    expect(screen.getByTestId("chart").textContent).toContain("1 titik");
  });

  it("pindah halaman lewat link navigasi, termasuk judul tab dan fokus", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("link", { name: "Metrics" }));
    await screen.findByRole("heading", { level: 1, name: "Metrics" });
    expect(document.title).toBe("Metrics · Pulse Monitor");
    expect(screen.getByRole("link", { name: "Metrics" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBeNull();
    expect(document.activeElement).toBe(document.querySelector("main"));
  });

  it("tautan lewati ke konten memindahkan fokus tanpa mengubah halaman", () => {
    window.location.hash = "#/metrics";
    render(<App />);
    fireEvent.click(screen.getByText("Lewati ke konten"));
    expect(document.activeElement).toBe(document.querySelector("main"));
    expect(window.location.hash).toBe("#/metrics");
  });

  it("membuka halaman langsung dari URL", () => {
    window.location.hash = "#/about";
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("About");
    expect(screen.getByText("pulse explain")).toBeTruthy();
  });

  it("Console tetap terpasang saat pindah halaman supaya riwayat perintahnya tidak hilang", async () => {
    render(<App />);
    const input = consoleInput();
    expect(input.closest("[hidden]")).not.toBeNull();
    goto("#/console");
    await waitFor(() => expect(input.closest("[hidden]")).toBeNull());
    goto("#/overview");
    await waitFor(() => expect(input.closest("[hidden]")).not.toBeNull());
    expect(consoleInput()).toBe(input); // elemen yang sama, bukan dibuat ulang
  });

  it("koneksi terputus: banner tampil dan kartu diredupkan", () => {
    render(<App />);
    connect();
    act(() => last().fail(FakeES.CONNECTING));
    expect(screen.getByRole("status").textContent).toContain("terputus");
    expect(screen.getByRole("region", { name: "CPU" }).className).toContain("old");
    expect(screen.getAllByText("data lama").length).toBeGreaterThan(0);
  });

  it("ganti tema lewat pemilih tersimpan dan diterapkan", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Tema"), { target: { value: "nord" } });
    expect(localStorage.getItem("pulse-theme")).toBe("nord");
    expect(document.documentElement.style.getPropertyValue("--background")).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("halaman Metrics", () => {
  it("minimal satu seri tetap tampil", () => {
    window.location.hash = "#/metrics";
    render(<App />);
    const toggle = (name) => screen.getByRole("button", { name });
    fireEvent.click(toggle("CPU"));
    fireEvent.click(toggle("Memori"));
    expect(toggle("CPU").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle("Disk")); // seri terakhir tidak bisa dimatikan
    expect(toggle("Disk").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("chart").textContent).toContain("seri disk");
  });

  it("jeda menghentikan riwayat bertambah, lanjutkan memulai lagi", () => {
    window.location.hash = "#/metrics";
    render(<App />);
    connect(10);
    expect(screen.getByTestId("chart").textContent).toContain("1 titik");

    fireEvent.click(screen.getByRole("button", { name: "Jeda" }));
    act(() => last().message(snap(20)));
    expect(screen.getByTestId("chart").textContent).toContain("1 titik");
    expect(screen.getByRole("button", { name: "Lanjutkan" })).toBeTruthy();
    expect(screen.getAllByRole("status").some((n) => n.textContent.includes("dijeda"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    act(() => last().message(snap(30)));
    expect(screen.getByTestId("chart").textContent).toContain("2 titik");
  });

  it("tombol Kosongkan dan Unduh CSV nonaktif saat riwayat kosong", () => {
    window.location.hash = "#/metrics";
    render(<App />);
    expect(screen.getByRole("button", { name: "Kosongkan" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Unduh CSV" }).disabled).toBe(true);
    connect();
    expect(screen.getByRole("button", { name: "Kosongkan" }).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Kosongkan" }));
    expect(screen.getByTestId("chart").textContent).toContain("0 titik");
  });

  it("tabel statistik bisa dijangkau keyboard saat perlu digulir", () => {
    window.location.hash = "#/metrics";
    render(<App />);
    const region = screen.getByRole("region", { name: /Tabel statistik/ });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(within(region).getByRole("table")).toBeTruthy();
  });

  it("tabel ringkasan menghitung statistik jendela riwayat", () => {
    window.location.hash = "#/metrics";
    render(<App />);
    act(() => last().open());
    for (const cpu of [10, 30, 20]) act(() => last().message(snap(cpu)));
    const row = screen.getByRole("row", { name: /CPU/ });
    expect(within(row).getAllByRole("cell").map((c) => c.textContent)).toEqual(["20.0%", "20.0%", "10.0%", "30.0%"]);
  });
});
