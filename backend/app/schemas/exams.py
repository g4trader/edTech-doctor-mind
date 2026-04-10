from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SpecialtyOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None

    model_config = {"from_attributes": True}


class ExamSummaryOut(BaseModel):
    id: UUID
    title: str
    description: str | None
    time_limit_minutes: int
    question_count: int

    model_config = {"from_attributes": True}


class QuestionOut(BaseModel):
    id: UUID
    prompt: str
    options: list[str]
    order_index: int

    model_config = {"from_attributes": True}


class ExamDetailOut(BaseModel):
    id: UUID
    title: str
    description: str | None
    time_limit_minutes: int
    specialty: SpecialtyOut
    questions: list[QuestionOut]


class AnswerIn(BaseModel):
    answers: list[int] = Field(
        ...,
        description="Índice da alternativa escolhida por questão, na ordem das questões.",
    )


class AnswerResultItem(BaseModel):
    question_id: UUID
    correct: bool
    correct_index: int
    explanation: str | None


class AnswerResultOut(BaseModel):
    score: float
    total: int
    items: list[AnswerResultItem]
