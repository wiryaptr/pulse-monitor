import time

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture()
def client():
    with TestClient(main.app) as c:
        yield c


@pytest.fixture()
def fast_client(monkeypatch):
    """Server dengan interval pendek supaya tes sampler tidak lama."""
    monkeypatch.setattr(main, "INTERVAL", 0.05)
    with TestClient(main.app) as c:
        yield c


def wait_until(predicate, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.02)
    return False


def test_sample_once_updates_state(client):
    state = client.app.state
    seq = state.seq
    assert main.sample_once(client.app) is True
    assert state.seq == seq + 1
    assert state.errors == 0


def test_failure_keeps_last_good_snapshot_and_recovers(client, monkeypatch):
    state = client.app.state
    good, seq = state.latest, state.seq

    def boom():
        raise OSError("psutil gagal")

    monkeypatch.setattr(main, "collect", boom)
    assert main.sample_once(client.app) is False
    assert main.sample_once(client.app) is False
    assert state.errors == 2
    assert state.latest is good  # data lama dipertahankan, bukan dikosongkan
    assert state.seq == seq  # tidak ada event baru untuk klien

    monkeypatch.undo()
    assert main.sample_once(client.app) is True
    assert state.errors == 0
    assert state.seq == seq + 1


def test_sampler_loop_survives_errors(fast_client, monkeypatch):
    state = fast_client.app.state
    real = main.collect
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        if 1 <= calls["n"] <= 3:  # tiga kegagalan berturut-turut
            raise OSError("simulasi")
        return real()

    seq = state.seq
    monkeypatch.setattr(main, "collect", flaky)
    assert wait_until(lambda: state.seq > seq), "loop sampler berhenti setelah exception"
    assert calls["n"] >= 4
    assert state.errors == 0


def test_health_turns_503_when_sampler_cannot_read(fast_client, monkeypatch):
    def boom():
        raise OSError("simulasi")

    monkeypatch.setattr(main, "collect", boom)
    assert wait_until(lambda: fast_client.get("/health").status_code == 503)
    body = fast_client.get("/health").json()
    assert body["status"] == "stale"
    assert body["errors"] > 0

    monkeypatch.undo()
    assert wait_until(lambda: fast_client.get("/health").status_code == 200)


def test_health_503_before_any_sample(client):
    client.app.state.updated_at = None
    r = client.get("/health")
    assert r.status_code == 503
    assert r.json()["sample_age_s"] is None


def test_env_number_default_and_valid(monkeypatch):
    monkeypatch.delenv("X_TEST", raising=False)
    assert main.env_number("X_TEST", 2.0, float, 0.5) == 2.0
    monkeypatch.setenv("X_TEST", "1.5")
    assert main.env_number("X_TEST", 2.0, float, 0.5) == 1.5
    monkeypatch.setenv("X_TEST", "  ")
    assert main.env_number("X_TEST", 7, int, 1) == 7


@pytest.mark.parametrize("raw", ["abc", "0", "-5"])
def test_env_number_rejects_bad_values(monkeypatch, raw):
    monkeypatch.setenv("X_TEST", raw)
    with pytest.raises(ValueError, match="X_TEST"):
        main.env_number("X_TEST", 20, int, 1)
