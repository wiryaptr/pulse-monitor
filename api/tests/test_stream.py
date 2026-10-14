"""Tes SSE lewat server uvicorn sungguhan, karena TestClient tidak bisa membaca aliran tanpa akhir."""
import json
import socket
import struct
import threading
import time
from contextlib import ExitStack

import httpx2 as httpx
import pytest
import uvicorn

import main


def wait_until(predicate, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.02)
    return False


@pytest.fixture()
def live(monkeypatch):
    monkeypatch.setattr(main, "INTERVAL", 0.2)
    monkeypatch.setattr(main, "MAX_STREAMS", 2)
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(main.app, host="127.0.0.1", port=port, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    assert wait_until(lambda: server.started), "server uji tidak mau start"
    yield port
    server.should_exit = True
    thread.join(timeout=5)


def open_stream(stack, port):
    client = stack.enter_context(httpx.Client(timeout=5))
    return stack.enter_context(client.stream("GET", f"http://127.0.0.1:{port}/stream"))


def test_stream_emits_valid_snapshots(live):
    with ExitStack() as stack:
        r = open_stream(stack, live)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
        events = []
        for line in r.iter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[len("data: "):]))
                if len(events) == 2:
                    break
    first, second = events
    assert main.Snapshot.model_validate(first)
    assert main.Snapshot.model_validate(second)
    assert second["ts"] >= first["ts"]


def test_stream_limit_is_enforced_and_released(live):
    with ExitStack() as stack:
        open_stream(stack, live)
        open_stream(stack, live)
        assert wait_until(lambda: main.app.state.streams == 2)
        assert httpx.get(f"http://127.0.0.1:{live}/stream", timeout=5).status_code == 503
    # semua stream ditutup, slot harus kembali
    assert wait_until(lambda: main.app.state.streams == 0), "counter stream bocor"
    with ExitStack() as stack:
        assert open_stream(stack, live).status_code == 200


def test_stream_counter_released_after_abrupt_disconnect(live):
    for _ in range(3):
        s = socket.create_connection(("127.0.0.1", live), timeout=5)
        s.sendall(b"GET /stream HTTP/1.1\r\nHost: x\r\n\r\n")
        s.recv(200)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, struct.pack("ii", 1, 0))  # RST, bukan FIN rapi
        s.close()
    assert wait_until(lambda: main.app.state.streams == 0), "counter bocor setelah koneksi diputus paksa"
