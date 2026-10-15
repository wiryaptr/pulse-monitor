#!/usr/bin/env bash
# Smoke test container Pulse Monitor: build image, jalankan, lalu periksa lewat HTTP.
#
#   ENGINE=podman ./scripts/smoke-containers.sh     build dan uji (bawaan ENGINE=docker)
#   KEEP=1 ENGINE=podman ./scripts/smoke-containers.sh   container dibiarkan hidup, buka http://localhost:8080
#   ./scripts/smoke-containers.sh --check-only http://localhost:8080   hanya pemeriksaan HTTP
set -euo pipefail

ENGINE="${ENGINE:-docker}"
PORT="${PORT:-8080}"
NET=pulse-smoke
API=pulse-smoke-api
WEB=pulse-smoke-web
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { printf '\n== %s\n' "$*"; }
fail() { printf 'GAGAL: %s\n' "$*" >&2; exit 1; }

# Pemeriksaan HTTP terhadap tumpukan yang sedang berjalan. $1 = alamat web, misalnya http://localhost:8080
check_stack() {
  local base="$1" body headers asset events

  log "web menyajikan halaman"
  body="$(curl -fsS "$base/")" || fail "GET / gagal"
  grep -q '<div id="root">' <<<"$body" || fail "index.html tidak berisi #root"

  log "proxy /api meneruskan ke backend"
  body="$(curl -fsS "$base/api/health")" || fail "GET /api/health gagal"
  grep -q '"status":"ok"' <<<"$body" || fail "/api/health tidak ok: $body"
  body="$(curl -fsS "$base/api/metrics")" || fail "GET /api/metrics gagal"
  for key in '"ts"' '"host"' '"cpu"' '"memory"' '"disk"'; do
    grep -q "$key" <<<"$body" || fail "/api/metrics tidak memuat $key: $body"
  done

  log "SSE lewat proxy mengalir (bukan tertahan buffer), dengan dan tanpa kompresi"
  events="$(timeout 7 curl -sN "$base/api/stream" | grep -c '^data: ' || true)"
  [[ "$events" -ge 2 ]] || fail "hanya $events event dalam 7 detik tanpa kompresi (butuh minimal 2)"
  events="$(timeout 7 curl -sN --compressed -H 'Accept-Encoding: gzip' "$base/api/stream" | grep -c '^data: ' || true)"
  [[ "$events" -ge 2 ]] || fail "hanya $events event dalam 7 detik dengan kompresi (butuh minimal 2)"

  log "header keamanan dan cache"
  headers="$(curl -fsSI "$base/")" || fail "HEAD / gagal"
  grep -qi '^x-content-type-options: nosniff' <<<"$headers" || fail "header nosniff tidak ada"
  grep -qi '^x-frame-options: deny' <<<"$headers" || fail "header x-frame-options tidak ada"
  grep -qi '^cache-control: no-cache' <<<"$headers" || fail "index.html seharusnya no-cache"
  if grep -qi '^server:' <<<"$headers"; then fail "header Server seharusnya disembunyikan"; fi
  asset="$(curl -fsS "$base/" | grep -o '/assets/[^"]*\.js' | head -n 1)"
  [[ -n "$asset" ]] || fail "tidak menemukan file JS di index.html"
  curl -fsSI "$base$asset" | grep -qi '^cache-control: .*immutable' || fail "aset berhash seharusnya immutable"

  log "SEMUA PEMERIKSAAN HTTP LOLOS"
}

if [[ "${1:-}" == "--check-only" ]]; then
  check_stack "${2:?pakai: --check-only http://localhost:8080}"
  exit 0
fi

build_flags=()
# Podman memakai format OCI bawaan yang mengabaikan HEALTHCHECK
if [[ "$ENGINE" == *podman* ]]; then build_flags=(--format docker); fi

cleanup() {
  "$ENGINE" rm -f "$WEB" "$API" >/dev/null 2>&1 || true
  "$ENGINE" network rm "$NET" >/dev/null 2>&1 || true
}

on_exit() {
  local rc=$?
  if [[ $rc -ne 0 ]]; then
    log "log container (karena ada yang gagal)"
    "$ENGINE" logs "$API" 2>&1 | tail -n 30 || true
    "$ENGINE" logs "$WEB" 2>&1 | tail -n 30 || true
  fi
  if [[ "${KEEP:-0}" == "1" && $rc -eq 0 ]]; then
    printf '\nContainer dibiarkan hidup. Buka http://localhost:%s\nBersihkan dengan: %s rm -f %s %s && %s network rm %s\n' \
      "$PORT" "$ENGINE" "$WEB" "$API" "$ENGINE" "$NET"
  else
    cleanup
  fi
}

wait_healthy() {
  local name="$1" status=""
  for _ in $(seq 1 40); do
    status="$("$ENGINE" inspect --format '{{.State.Health.Status}}' "$name" 2>/dev/null || true)"
    [[ "$status" == "healthy" ]] && return 0
    sleep 2
  done
  fail "$name tidak pernah healthy (status terakhir: ${status:-kosong}). Image dibangun dengan format docker?"
}

# Hanya informasi, bukan pemeriksaan: apa yang dibaca psutil di dalam container dibanding host
report_metrics() {
  log "psutil di dalam container dibanding host (informasi, tidak ada pemeriksaan)"
  "$ENGINE" exec -i "$API" python - <<'PY'
import psutil, time
vm, du = psutil.virtual_memory(), psutil.disk_usage("/")
print(f"container  RAM total  : {vm.total / 2**30:.2f} GiB")
print(f"container  disk /     : total {du.total / 2**30:.1f} GiB, terpakai {du.percent}%")
print(f"container  uptime     : {(time.time() - psutil.boot_time()) / 60:.1f} menit")
print(f"container  CPU core   : {psutil.cpu_count()}")
print("container  antarmuka  :", " ".join(sorted(psutil.net_if_addrs())))
PY
  awk '/MemTotal/ {printf "host       RAM total  : %.2f GiB\n", $2 / 1048576}' /proc/meminfo
  df -P / | awk 'NR==2 {printf "host       disk /     : total %.1f GiB, terpakai %s\n", $2 / 1048576, $5}'
  awk '{printf "host       uptime     : %.1f menit\n", $1 / 60}' /proc/uptime
  printf 'host       CPU core   : %s\n' "$(nproc)"
  printf 'host       antarmuka  : %s\n' "$(find /sys/class/net -mindepth 1 -maxdepth 1 -printf '%f ')"
}

trap on_exit EXIT
cleanup

log "build image API"
"$ENGINE" build "${build_flags[@]}" -f "$ROOT/api/Containerfile" -t pulse-api:smoke "$ROOT/api"
log "build image web"
"$ENGINE" build "${build_flags[@]}" -f "$ROOT/frontend/Containerfile" -t pulse-web:smoke "$ROOT/frontend"

log "jalankan container (rootfs read-only, semua capability dibuang)"
"$ENGINE" network create "$NET" >/dev/null
"$ENGINE" run -d --name "$API" --network "$NET" --network-alias api \
  --read-only --cap-drop ALL --security-opt no-new-privileges pulse-api:smoke >/dev/null
# Caddy memakai file capability net_bind_service, jadi capability itu harus tetap ada agar binary-nya bisa dieksekusi
"$ENGINE" run -d --name "$WEB" --network "$NET" -p "$PORT:8080" \
  --read-only --tmpfs /tmp --cap-drop ALL --cap-add NET_BIND_SERVICE --security-opt no-new-privileges pulse-web:smoke >/dev/null

log "tunggu healthcheck"
wait_healthy "$API"
wait_healthy "$WEB"

log "proses tidak berjalan sebagai root"
for name in "$API" "$WEB"; do
  uid="$("$ENGINE" exec "$name" id -u)"
  [[ "$uid" != "0" ]] || fail "$name berjalan sebagai root"
  printf '%s: uid %s\n' "$name" "$uid"
done

check_stack "http://127.0.0.1:$PORT"
report_metrics
