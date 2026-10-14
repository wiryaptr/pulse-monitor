"""API Pulse Monitor: membaca metrik sistem dan menyiarkannya lewat SSE."""
import asyncio
import contextlib
import json
import logging
import os
import socket
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated

import psutil
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("pulse")


def env_number(name: str, default, cast, minimum):
    """Baca angka dari environment variable dan gagal cepat kalau nilainya salah."""
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = cast(raw)
    except ValueError:
        raise ValueError(f"{name} harus berupa {cast.__name__}, dapat: {raw!r}") from None
    if value < minimum:
        raise ValueError(f"{name} minimal {minimum}, dapat: {value}")
    return value


INTERVAL = env_number("PULSE_INTERVAL", 2.0, float, 0.5)  # detik antar pembacaan
MAX_STREAMS = env_number("MAX_STREAMS", 20, int, 1)
STALE_FACTOR = 3  # pembacaan dianggap basi setelah 3x interval tanpa pembaruan
ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

Percent = Annotated[float, Field(ge=0, le=100)]


class Host(BaseModel):
    hostname: str
    uptime_s: int = Field(ge=0)


class Cpu(BaseModel):
    percent: Percent


class Memory(BaseModel):
    percent: Percent


class Disk(BaseModel):
    mount: str
    percent: Percent


class Snapshot(BaseModel):
    """Kontrak data /metrics dan /stream. ts memakai UTC, dibuat server saat membaca."""

    ts: datetime
    interval_s: float
    host: Host
    cpu: Cpu
    memory: Memory
    disk: Disk


def pct(value: float) -> float:
    return min(max(float(value), 0.0), 100.0)


def collect() -> Snapshot:
    """Satu pembacaan lengkap. Melempar exception kalau psutil gagal."""
    return Snapshot(
        ts=datetime.now(timezone.utc).replace(microsecond=0),
        interval_s=INTERVAL,
        host=Host(
            hostname=socket.gethostname(),
            uptime_s=max(0, int(time.time() - psutil.boot_time())),
        ),
        cpu=Cpu(percent=pct(psutil.cpu_percent(interval=None))),
        memory=Memory(percent=pct(psutil.virtual_memory().percent)),
        disk=Disk(mount="/", percent=pct(psutil.disk_usage("/").percent)),
    )


def sse(data: dict) -> str:
    """Format satu event SSE."""
    return f"data: {json.dumps(data)}\n\n"


def sample_once(app: FastAPI) -> bool:
    """Ambil satu pembacaan. Kalau gagal, simpan pembacaan terakhir yang baik dan catat errornya."""
    state = app.state
    try:
        snapshot = collect()
    except Exception:  # sampler harus tetap hidup apa pun yang terjadi
        state.errors += 1
        if state.errors == 1 or state.errors % 30 == 0:  # jangan banjiri log
            log.exception("gagal membaca metrik (kegagalan berturut-turut: %d)", state.errors)
        return False
    if state.errors:
        log.info("sampler pulih setelah %d kegagalan", state.errors)
    state.errors = 0
    state.latest = snapshot
    state.updated_at = time.monotonic()
    state.seq += 1
    return True


def sample_age(app: FastAPI) -> float | None:
    """Umur pembacaan terakhir dalam detik, atau None kalau belum pernah berhasil."""
    if app.state.updated_at is None:
        return None
    return time.monotonic() - app.state.updated_at


async def sampler(app: FastAPI) -> None:
    """Satu loop bersama. Semua koneksi membaca hasil terakhirnya."""
    while True:
        await asyncio.sleep(INTERVAL)
        sample_once(app)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.latest = None
    app.state.updated_at = None
    app.state.seq = 0
    app.state.streams = 0
    app.state.errors = 0
    psutil.cpu_percent(interval=None)  # pemanasan: pembacaan pertama selalu 0
    await asyncio.sleep(0.5)
    sample_once(app)
    task = asyncio.create_task(sampler(app))
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="Pulse Monitor API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}


@app.get("/health")
def health():
    """200 kalau sampler masih menghasilkan data baru, 503 kalau data basi atau belum ada."""
    age = sample_age(app)
    stale = age is None or age > STALE_FACTOR * INTERVAL
    body = {
        "status": "stale" if stale else "ok",
        "sample_age_s": None if age is None else round(age, 1),
        "errors": app.state.errors,
    }
    return JSONResponse(body, status_code=503 if stale else 200)


@app.get("/metrics", response_model=Snapshot)
def metrics():
    if app.state.latest is None:
        raise HTTPException(status_code=503, detail="Belum ada pembacaan")
    return app.state.latest


@app.get("/stream")
async def stream(request: Request):
    if app.state.streams >= MAX_STREAMS:
        raise HTTPException(status_code=503, detail="Terlalu banyak koneksi, coba lagi nanti")

    async def events():
        app.state.streams += 1
        last = -1
        try:
            while not await request.is_disconnected():
                if app.state.latest is not None and app.state.seq != last:
                    last = app.state.seq
                    yield sse(app.state.latest.model_dump(mode="json"))
                await asyncio.sleep(0.5)
        finally:
            app.state.streams -= 1

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
