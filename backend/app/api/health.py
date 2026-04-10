from fastapi import APIRouter

from app.services.ollama_client import ollama_health

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    ollama_ok = await ollama_health()
    return {"status": "ok", "ollama": ollama_ok}
