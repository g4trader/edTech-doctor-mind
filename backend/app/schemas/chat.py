from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ChatMessageIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=8000)
    specialty_slug: str | None = Field(
        default=None,
        description="Filtra o RAG por especialidade quando informado.",
    )


class ChatMessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionOut(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatReplyOut(BaseModel):
    session_id: UUID
    assistant_message: ChatMessageOut
    sources: list[dict]


class ChatSessionCreateOut(BaseModel):
    session: ChatSessionOut
