from typing import Any

import httpx

from app.config import settings


class OllamaError(Exception):
    pass


async def ollama_embed(text: str) -> list[float]:
    url = f"{settings.ollama_base_url.rstrip('/')}/api/embeddings"
    payload = {"model": settings.ollama_embed_model, "prompt": text}
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            r = await client.post(url, json=payload)
        except httpx.RequestError as e:
            raise OllamaError(str(e)) from e
        if r.status_code != 200:
            raise OllamaError(f"Embeddings failed: {r.status_code} {r.text}")
        data = r.json()
        emb = data.get("embedding")
        if not emb:
            raise OllamaError("No embedding in response")
        return emb


async def ollama_chat(
    messages: list[dict[str, str]],
    system: str | None = None,
) -> str:
    url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    msgs: list[dict[str, Any]] = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(messages)
    payload = {
        "model": settings.ollama_chat_model,
        "messages": msgs,
        "stream": False,
        "options": {"temperature": 0.3},
    }
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            r = await client.post(url, json=payload)
        except httpx.RequestError as e:
            raise OllamaError(str(e)) from e
        if r.status_code != 200:
            raise OllamaError(f"Chat failed: {r.status_code} {r.text}")
        data = r.json()
        msg = data.get("message") or {}
        content = msg.get("content")
        if not content:
            raise OllamaError("Empty model response")
        return content.strip()


async def ollama_health() -> bool:
    try:
        url = f"{settings.ollama_base_url.rstrip('/')}/api/tags"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            return r.status_code == 200
    except (OSError, httpx.RequestError):
        return False
