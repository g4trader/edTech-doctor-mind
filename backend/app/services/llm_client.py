from collections.abc import Sequence
from typing import Any

import httpx
from huggingface_hub import AsyncInferenceClient

from app.config import settings


class LLMError(Exception):
    pass


def _raise_bad_backend() -> None:
    raise LLMError(f"Backend de IA não suportado: {settings.resolved_ai_backend}")


async def _ollama_embed(text: str) -> list[float]:
    url = f"{settings.ollama_base_url.rstrip('/')}/api/embeddings"
    payload = {"model": settings.ollama_embed_model, "prompt": text}
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            r = await client.post(url, json=payload)
        except httpx.RequestError as e:
            raise LLMError(str(e)) from e
        if r.status_code != 200:
            raise LLMError(f"Embeddings failed: {r.status_code} {r.text}")
        data = r.json()
        emb = data.get("embedding")
        if not emb:
            raise LLMError("No embedding in response")
        return [float(v) for v in emb]


def _mean_pool_embedding(data: Sequence[Any]) -> list[float]:
    if not data:
        raise LLMError("Embedding vazio")
    first = data[0]
    if isinstance(first, (int, float)):
        return [float(v) for v in data]
    if isinstance(first, Sequence):
        pooled = [0.0 for _ in range(len(first))]
        rows = 0
        for row in data:
            if not isinstance(row, Sequence):
                continue
            for i, value in enumerate(row):
                pooled[i] += float(value)
            rows += 1
        if rows == 0:
            raise LLMError("Embedding inválido")
        return [value / rows for value in pooled]
    raise LLMError("Formato de embedding não suportado")


async def _hf_embed(text: str) -> list[float]:
    if not settings.hf_token:
        raise LLMError("HF_TOKEN não configurado")
    client = AsyncInferenceClient(provider="hf-inference", api_key=settings.hf_token)
    try:
        embedding = await client.feature_extraction(
            text,
            model=settings.hf_embed_model,
        )
    except Exception as e:
        raise LLMError(str(e)) from e
    return _mean_pool_embedding(embedding)


async def embed_text(text: str) -> list[float]:
    backend = settings.resolved_ai_backend
    if backend == "ollama":
        return await _ollama_embed(text)
    if backend == "huggingface":
        return await _hf_embed(text)
    _raise_bad_backend()


async def _ollama_chat(
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
            raise LLMError(str(e)) from e
        if r.status_code != 200:
            raise LLMError(f"Chat failed: {r.status_code} {r.text}")
        data = r.json()
        msg = data.get("message") or {}
        content = msg.get("content")
        if not content:
            raise LLMError("Empty model response")
        return content.strip()


async def _hf_chat(
    messages: list[dict[str, str]],
    system: str | None = None,
) -> str:
    if not settings.hf_token:
        raise LLMError("HF_TOKEN não configurado")
    payload_messages: list[dict[str, str]] = []
    if system:
        payload_messages.append({"role": "system", "content": system})
    payload_messages.extend(messages)
    payload = {
        "model": settings.hf_chat_model,
        "messages": payload_messages,
        "stream": False,
        "temperature": 0.3,
    }
    headers = {"Authorization": f"Bearer {settings.hf_token}"}
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            r = await client.post(
                "https://router.huggingface.co/v1/chat/completions",
                headers=headers,
                json=payload,
            )
        except httpx.RequestError as e:
            raise LLMError(str(e)) from e
        if r.status_code != 200:
            raise LLMError(f"Chat failed: {r.status_code} {r.text}")
        data = r.json()
        choices = data.get("choices") or []
        if not choices:
            raise LLMError("Empty model response")
        content = ((choices[0] or {}).get("message") or {}).get("content")
        if not content:
            raise LLMError("Empty model response")
        return str(content).strip()


async def chat_completion(
    messages: list[dict[str, str]],
    system: str | None = None,
) -> str:
    backend = settings.resolved_ai_backend
    if backend == "ollama":
        return await _ollama_chat(messages, system=system)
    if backend == "huggingface":
        return await _hf_chat(messages, system=system)
    _raise_bad_backend()


async def ai_health() -> bool:
    backend = settings.resolved_ai_backend
    try:
        if backend == "huggingface":
            return bool(settings.hf_token)
        if backend == "ollama":
            url = f"{settings.ollama_base_url.rstrip('/')}/api/tags"
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(url)
                return r.status_code == 200
    except (OSError, httpx.RequestError):
        return False
    return False
