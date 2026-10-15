"""Container dihentikan dengan SIGTERM. Selama masih ada klien SSE yang terbuka, uvicorn tanpa batas
waktu tidak mau berhenti, sehingga engine harus mengirim SIGKILL setelah 10 detik. Tes ini menjalankan
uvicorn dengan argumen persis dari CMD di Dockerfile."""
import json
import re
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

DOCKERFILE = Path(__file__).resolve().parents[1] / "Dockerfile"
API_DIR = DOCKERFILE.parent
BATAS_DETIK = 8  # di bawah batas bawaan Podman dan Docker (10 detik)


def containerfile_args() -> list[str]:
    match = re.search(r"^CMD (\[.*\])$", DOCKERFILE.read_text(), re.M)
    assert match, "CMD tidak ditemukan di Dockerfile"
    cmd = json.loads(match.group(1))
    assert cmd[0] == "uvicorn"
    return cmd[1:]


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def test_sigterm_with_open_sse_client_exits_quickly():
    port = free_port()
    args = containerfile_args()
    for i, arg in enumerate(args):  # alamat diganti agar aman dijalankan di mesin uji
        if arg == "--host":
            args[i + 1] = "127.0.0.1"
        if arg == "--port":
            args[i + 1] = str(port)

    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", *args], cwd=API_DIR,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    client = None
    try:
        deadline = time.monotonic() + 15
        while True:
            try:
                client = socket.create_connection(("127.0.0.1", port), timeout=1)
                break
            except OSError:
                assert time.monotonic() < deadline, "server uji tidak mau start"
                time.sleep(0.1)
        client.sendall(b"GET /stream HTTP/1.1\r\nHost: x\r\n\r\n")
        assert b"200" in client.recv(200), "stream SSE tidak terbuka"

        started = time.monotonic()
        proc.send_signal(signal.SIGTERM)
        proc.wait(timeout=BATAS_DETIK)
        assert time.monotonic() - started < BATAS_DETIK
    finally:
        if client:
            client.close()
        if proc.poll() is None:
            proc.kill()
            proc.wait()
