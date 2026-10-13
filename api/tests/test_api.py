import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture()
def client():
    with TestClient(main.app) as c:
        yield c


def test_read_metrics_range():
    data = main.read_metrics()
    assert set(data) == {"cpu", "ram", "disk"}
    assert all(0 <= v <= 100 for v in data.values())


def test_sse_format():
    assert main.sse({"cpu": 1}) == 'data: {"cpu": 1}\n\n'


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_metrics(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    assert set(r.json()) == {"cpu", "ram", "disk"}


def test_cors_allowed_origin(client):
    r = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_blocked_origin(client):
    r = client.get("/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in r.headers


def test_stream_limit(client):
    client.app.state.streams = main.MAX_STREAMS
    assert client.get("/stream").status_code == 503
