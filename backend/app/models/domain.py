from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

EMBED_DIM = 768  # nomic-embed-text


class Specialty(Base):
    __tablename__ = "specialties"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    exams: Mapped[list["Exam"]] = relationship(back_populates="specialty")
    topics: Mapped[list["Topic"]] = relationship(back_populates="specialty")
    contents: Mapped[list["ContentItem"]] = relationship(back_populates="specialty")
    mentorship_products: Mapped[list["MentorshipProduct"]] = relationship(
        back_populates="specialty"
    )


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    specialty_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("specialties.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    specialty: Mapped["Specialty"] = relationship(back_populates="exams")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )
    attempts: Mapped[list["ExamAttempt"]] = relationship(back_populates="exam")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    exam_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exams.id", ondelete="CASCADE"), nullable=False
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSONB, nullable=False)
    correct_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    exam: Mapped["Exam"] = relationship(back_populates="questions")
    topic_links: Mapped[list["QuestionTopicLink"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )
    answers: Mapped[list["ExamAttemptAnswer"]] = relationship(back_populates="question")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user")
    auth_tokens: Mapped[list["AuthToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    content_progress: Mapped[list["ContentProgress"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    exam_attempts: Mapped[list["ExamAttempt"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    study_plans: Mapped[list["StudyPlan"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    mentorship_enrollments: Mapped[list["CohortEnrollment"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    billing_cycle: Mapped[str] = mapped_column(String(40), default="monthly")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("subscription_plans.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(40), default="active")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="subscriptions")
    plan: Mapped["SubscriptionPlan"] = relationship(back_populates="subscriptions")


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="auth_tokens")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    specialty_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("specialties.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    specialty: Mapped["Specialty"] = relationship(back_populates="topics")
    subtopics: Mapped[list["Subtopic"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )
    contents: Mapped[list["ContentItem"]] = relationship(back_populates="topic")
    question_links: Mapped[list["QuestionTopicLink"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )
    study_plan_items: Mapped[list["StudyPlanItem"]] = relationship(back_populates="topic")


class Subtopic(Base):
    __tablename__ = "subtopics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    topic: Mapped["Topic"] = relationship(back_populates="subtopics")
    contents: Mapped[list["ContentItem"]] = relationship(back_populates="subtopic")


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    specialty_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("specialties.id", ondelete="CASCADE"), nullable=False
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    subtopic_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("subtopics.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=20)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    specialty: Mapped["Specialty"] = relationship(back_populates="contents")
    topic: Mapped["Topic"] = relationship(back_populates="contents")
    subtopic: Mapped["Subtopic"] = relationship(back_populates="contents")
    progress_entries: Mapped[list["ContentProgress"]] = relationship(
        back_populates="content", cascade="all, delete-orphan"
    )
    study_plan_items: Mapped[list["StudyPlanItem"]] = relationship(
        back_populates="content"
    )


class ContentProgress(Base):
    __tablename__ = "content_progress"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False
    )
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    minutes_spent: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="content_progress")
    content: Mapped["ContentItem"] = relationship(back_populates="progress_entries")


class QuestionTopicLink(Base):
    __tablename__ = "question_topic_links"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )

    question: Mapped["Question"] = relationship(back_populates="topic_links")
    topic: Mapped["Topic"] = relationship(back_populates="question_links")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)

    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    session: Mapped["ChatSession"] = relationship(back_populates="messages")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    exam_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exams.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[float] = mapped_column(nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_answers: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="exam_attempts")
    exam: Mapped["Exam"] = relationship(back_populates="attempts")
    answers: Mapped[list["ExamAttemptAnswer"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )


class ExamAttemptAnswer(Base):
    __tablename__ = "exam_attempt_answers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    selected_index: Mapped[int] = mapped_column(Integer, nullable=False)
    correct: Mapped[bool] = mapped_column(Boolean, default=False)

    attempt: Mapped["ExamAttempt"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(back_populates="answers")


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    specialty_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("specialties.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    weekly_hours: Mapped[int] = mapped_column(Integer, default=4)
    status: Mapped[str] = mapped_column(String(40), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="study_plans")
    specialty: Mapped["Specialty"] = relationship()
    items: Mapped[list["StudyPlanItem"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )


class StudyPlanItem(Base):
    __tablename__ = "study_plan_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_plans.id", ondelete="CASCADE"), nullable=False
    )
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("topics.id", ondelete="SET NULL")
    )
    content_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("content_items.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text)
    week_index: Mapped[int] = mapped_column(Integer, default=1)
    day_label: Mapped[str] = mapped_column(String(40), default="Segunda")
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=45)
    status: Mapped[str] = mapped_column(String(40), default="pending")

    plan: Mapped["StudyPlan"] = relationship(back_populates="items")
    topic: Mapped["Topic"] = relationship(back_populates="study_plan_items")
    content: Mapped["ContentItem"] = relationship(back_populates="study_plan_items")


class Mentor(Base):
    __tablename__ = "mentors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False)

    products: Mapped[list["MentorshipProduct"]] = relationship(back_populates="mentor")


class MentorshipProduct(Base):
    __tablename__ = "mentorship_products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mentor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mentors.id", ondelete="CASCADE"), nullable=False
    )
    specialty_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("specialties.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price_cents: Mapped[int] = mapped_column(Integer, default=0)

    mentor: Mapped["Mentor"] = relationship(back_populates="products")
    specialty: Mapped["Specialty"] = relationship(back_populates="mentorship_products")
    cohorts: Mapped[list["MentorshipCohort"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class MentorshipCohort(Base):
    __tablename__ = "mentorship_cohorts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mentorship_products.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="open")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=20)
    meeting_url: Mapped[str | None] = mapped_column(String(500))
    access_instructions: Mapped[str | None] = mapped_column(Text)

    product: Mapped["MentorshipProduct"] = relationship(back_populates="cohorts")
    enrollments: Mapped[list["CohortEnrollment"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan"
    )


class CohortEnrollment(Base):
    __tablename__ = "cohort_enrollments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cohort_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mentorship_cohorts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(40), default="confirmed")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    cohort: Mapped["MentorshipCohort"] = relationship(back_populates="enrollments")
    user: Mapped["User"] = relationship(back_populates="mentorship_enrollments")


class RagChunk(Base):
    __tablename__ = "rag_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(300), nullable=True)
    specialty_slug: Mapped[str | None] = mapped_column(String(120), nullable=True)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBED_DIM), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
