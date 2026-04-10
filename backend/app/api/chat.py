from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_active_subscription
from app.database import get_session
from app.models.domain import ChatMessage, ChatSession, User
from app.schemas.chat import (
    ChatMessageIn,
    ChatMessageOut,
    ChatReplyOut,
    ChatSessionCreateOut,
    ChatSessionOut,
)
from app.services.chat import append_and_reply

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=ChatSessionCreateOut)
async def create_session(
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    del user
    s = ChatSession()
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return ChatSessionCreateOut(session=ChatSessionOut.model_validate(s))


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
async def list_messages(
    session_id: UUID,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    del user
    sess = await db.get(ChatSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    q = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    msgs = q.scalars().all()
    return [ChatMessageOut.model_validate(m) for m in msgs]


@router.post("/sessions/{session_id}/messages", response_model=ChatReplyOut)
async def post_message(
    session_id: UUID,
    body: ChatMessageIn,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    del user
    sess = await db.get(ChatSession, session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    try:
        asst, sources = await append_and_reply(
            db, session_id, body.content, body.specialty_slug
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    return ChatReplyOut(
        session_id=session_id,
        assistant_message=ChatMessageOut.model_validate(asst),
        sources=sources,
    )
