from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture()
def client():
    with TestClient(main.app) as c:
        yield c


SNAPSHOT_KEYS = {"ts", "interval_s", "host", "cpu", "memory", "disk"}


def test_collect_contract():
    data = main.collect().model_dump(mode="json")
    assert set(data) == SNAPSHOT_KEYS
    assert set(data["host"]) == {"hostname", "uptime_s"}
    assert data["host"]["hostname"]
    assert data["host"]["uptime_s"] >= 0
    for part in ("cpu", "memory", "disk"):
        assert 0 <= data[part]["percent"] <= 100
    assert data["disk"]["mount"] == "/"


def test_pct_clamps_out_of_range_values():
    assert main.pct(-3) == 0.0
    assert main.pct(104.2) == 100.0
    assert main.pct(42.5) == 42.5


def test_sse_format():
    assert main.sse({"cpu": 1}) == 'data: {"cpu": 1}\n\n'


def test_root(client):
    assert client.get("/").json() == {"status": "ok", "docs": "/docs"}


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["errors"] == 0
    assert body["sample_age_s"] is not None


def test_metrics_contract(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    data = r.json()
    assert set(data) == SNAPSHOT_KEYS
    assert data["interval_s"] == main.INTERVAL
    assert data["ts"].endswith("Z")  # UTC
    ts = datetime.fromisoformat(data["ts"].replace("Z", "+00:00"))
    assert ts.tzinfo == timezone.utc


def test_metrics_503_before_first_sample(client):
    client.app.state.latest = None
    assert client.get("/metrics").status_code == 503


def test_unknown_path_and_wrong_method(client):
    assert client.get("/nope").status_code == 404
    assert client.post("/metrics").status_code == 405


def test_cors_allowed_origin(client):
    r = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_blocked_origin(client):
    r = client.get("/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in r.headers


def test_stream_limit(client):
    client.app.state.streams = main.MAX_STREAMS
    assert client.get("/stream").status_code == 503
