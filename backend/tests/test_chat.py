def test_create_chat_session(client) -> None:
    r = client.post("/api/chat/sessions")
    assert r.status_code == 200
    data = r.json()
    assert "session" in data
    assert data["session"]["id"]


def test_post_message_returns_assistant(client) -> None:
    r = client.post("/api/chat/sessions")
    sid = r.json()["session"]["id"]
    r2 = client.post(
        f"/api/chat/sessions/{sid}/messages",
        json={"content": "O que é hipertensão arterial?"},
    )
    assert r2.status_code == 200, r2.text
    out = r2.json()
    assert "assistant_message" in out
    assert out["assistant_message"]["role"] == "assistant"
    assert len(out["assistant_message"]["content"]) > 0


def test_list_messages_after_post(client) -> None:
    r = client.post("/api/chat/sessions")
    sid = r.json()["session"]["id"]
    client.post(
        f"/api/chat/sessions/{sid}/messages",
        json={"content": "Teste de mensagem"},
    )
    r3 = client.get(f"/api/chat/sessions/{sid}/messages")
    assert r3.status_code == 200
    msgs = r3.json()
    assert len(msgs) >= 2
    roles = [m["role"] for m in msgs]
    assert "user" in roles
    assert "assistant" in roles
