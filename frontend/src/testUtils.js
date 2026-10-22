// Bantuan untuk tes: EventSource palsu yang bisa dikendalikan dan contoh snapshot dari server.
export class FakeES {
  static instances = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  constructor(url) {
    this.url = url;
    this.readyState = FakeES.CONNECTING;
    this.closed = false;
    FakeES.instances.push(this);
  }
  close() { this.closed = true; this.readyState = FakeES.CLOSED; }
  open() { this.readyState = FakeES.OPEN; this.onopen?.(); }
  message(payload) { this.onmessage?.({ data: typeof payload === "string" ? payload : JSON.stringify(payload) }); }
  fail(readyState) { this.readyState = readyState; this.onerror?.(); }
}

export const snap = (cpu = 10, extra = {}) => ({
  ts: "2026-10-14T10:00:00Z",
  interval_s: 2,
  host: { hostname: "vm", uptime_s: 3600 },
  cpu: { percent: cpu },
  memory: { percent: 20 },
  disk: { mount: "/", percent: 30 },
  ...extra,
});

export const last = () => FakeES.instances[FakeES.instances.length - 1];
