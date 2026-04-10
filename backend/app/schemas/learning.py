from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.exams import ExamSummaryOut


class TopicOut(BaseModel):
    id: UUID
    title: str
    slug: str
    description: str | None


class SubtopicOut(BaseModel):
    id: UUID
    title: str
    slug: str
    description: str | None


class ContentSummaryOut(BaseModel):
    id: UUID
    title: str
    slug: str
    summary: str | None
    estimated_minutes: int
    topic_title: str
    completed: bool = False


class ContentDetailOut(BaseModel):
    id: UUID
    title: str
    slug: str
    summary: str | None
    body: str
    estimated_minutes: int
    specialty_name: str
    topic: TopicOut
    subtopic: SubtopicOut | None
    completed: bool = False
    minutes_spent: int = 0


class SpecialtyLibraryOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    topic_count: int
    content_count: int
    exam_count: int


class SpecialtyDetailOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    topics: list[TopicOut]
    contents: list[ContentSummaryOut]
    exams: list[ExamSummaryOut]


class ContentProgressIn(BaseModel):
    completed: bool = False
    minutes_spent: int = Field(default=0, ge=0, le=600)


class ContentProgressOut(BaseModel):
    content_id: UUID
    completed: bool
    minutes_spent: int
    completed_at: datetime | None


class ProficiencyTopicOut(BaseModel):
    topic_title: str
    question_count: int
    correct_answers: int
    accuracy: float


class ProficiencySpecialtyOut(BaseModel):
    specialty_slug: str
    specialty_name: str
    attempts: int
    average_score: float
    gap_level: str
    topics: list[ProficiencyTopicOut]


class StudyPlanItemOut(BaseModel):
    id: UUID
    title: str
    day_label: str
    week_index: int
    estimated_minutes: int
    rationale: str | None
    content_id: UUID | None
    topic_title: str | None
    status: str


class StudyPlanOut(BaseModel):
    id: UUID
    title: str
    goal: str
    weekly_hours: int
    status: str
    specialty_name: str | None
    created_at: datetime
    items: list[StudyPlanItemOut]


class StudyPlanCreateIn(BaseModel):
    specialty_slug: str | None = None
    weekly_hours: int = Field(default=4, ge=1, le=40)
    goal: str = Field(..., min_length=12, max_length=500)


class DashboardOut(BaseModel):
    user_name: str
    active_subscription_name: str | None
    completed_contents: int
    total_contents: int
    total_attempts: int
    average_score: float
    proficiency: list[ProficiencySpecialtyOut]
    current_plan: StudyPlanOut | None
    upcoming_mentorships: list[dict]

