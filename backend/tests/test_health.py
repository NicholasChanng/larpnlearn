from fastapi.testclient import TestClient

from app.main import app


def test_health():
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_world_returns_levels():
    client = TestClient(app)
    r = client.get("/api/v1/courses/cs188-sp2024/world")
    assert r.status_code == 200
    body = r.json()
    assert body["theme"] == "greek"
    assert len(body["levels"]) == 15


def test_start_battle_returns_question():
    client = TestClient(app)
    r = client.post(
        "/api/v1/battles/start",
        json={"level_id": "00000000-0000-0000-0000-000000000002"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "initial_question" in body
    assert body["user_hp"] == 30
