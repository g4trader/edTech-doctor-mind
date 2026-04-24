from fastapi import APIRouter

from app.config import settings
from app.services.llm_client import ai_health

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    ai_ok = await ai_health()
    return {
        "status": "ok",
        "ai": ai_ok,
        "backend": settings.resolved_ai_backend,
        "ollama": settings.resolved_ai_backend == "ollama" and ai_ok,
    }
