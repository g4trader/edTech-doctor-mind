def test_health(client) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "ollama" in data


def test_root(client) -> None:
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["name"] == "Doctor Mind API"
