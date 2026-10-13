"""API Pulse Monitor: membaca metrik sistem dan menyiarkannya lewat SSE."""
import asyncio
import json
import os
from contextlib import asynccontextmanager

import psutil
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

INTERVAL = 2  # detik antar pembacaan
MAX_STREAMS = int(os.getenv("MAX_STREAMS", "20"))
ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]


def read_metrics() -> dict:
    """Satu pembacaan CPU, RAM, dan disk dalam persen."""
    return {
        "cpu": psutil.cpu_percent(interval=None),
        "ram": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage("/").percent,
    }


def sse(data: dict) -> str:
    """Format satu event SSE."""
    return f"data: {json.dumps(data)}\n\n"


async def sampler(app: FastAPI) -> None:
    """Satu loop bersama. Semua koneksi membaca hasil terakhirnya."""
    while True:
        await asyncio.sleep(INTERVAL)
        app.state.latest = read_metrics()
        app.state.seq += 1


@asynccontextmanager
async def lifespan(app: FastAPI):
    psutil.cpu_percent(interval=None)  # pemanasan: pembacaan pertama selalu 0
    await asyncio.sleep(0.5)
    app.state.latest = read_metrics()
    app.state.seq = 0
    app.state.streams = 0
    task = asyncio.create_task(sampler(app))
    yield
    task.cancel()


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
    return {"status": "ok"}


@app.get("/metrics")
def metrics():
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
                if app.state.seq != last:
                    last = app.state.seq
                    yield sse(app.state.latest)
                await asyncio.sleep(0.5)
        finally:
            app.state.streams -= 1

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
