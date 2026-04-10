from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_active_subscription
from app.database import get_session
from app.models.domain import (
    ContentItem,
    ContentProgress,
    Exam,
    Question,
    Specialty,
    Subtopic,
    User,
)
from app.schemas.learning import (
    ContentDetailOut,
    ContentProgressIn,
    DashboardOut,
    SpecialtyDetailOut,
    SpecialtyLibraryOut,
    StudyPlanCreateIn,
    StudyPlanOut,
)
from app.services.auth import get_active_subscription_from_user
from app.services.learning import (
    build_dashboard,
    generate_study_plan,
    get_current_study_plan,
    serialize_study_plan,
    upsert_content_progress,
)

router = APIRouter(tags=["learning"])


@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    subscription = get_active_subscription_from_user(user)
    return await build_dashboard(
        db, user, subscription.plan.name if subscription else None
    )


@router.get("/library", response_model=list[SpecialtyLibraryOut])
async def list_library(
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    del user
    content_counts = {
        specialty_id: count
        for specialty_id, count in (
            await db.execute(
                select(ContentItem.specialty_id, func.count())
                .where(ContentItem.is_published.is_(True))
                .group_by(ContentItem.specialty_id)
            )
        ).all()
    }
    exam_counts = {
        specialty_id: count
        for specialty_id, count in (
            await db.execute(
                select(Exam.specialty_id, func.count()).group_by(Exam.specialty_id)
            )
        ).all()
    }

    stmt = (
        select(Specialty)
        .options(selectinload(Specialty.topics))
        .order_by(Specialty.name.asc())
    )
    specialties = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": specialty.id,
            "name": specialty.name,
            "slug": specialty.slug,
            "description": specialty.description,
            "topic_count": len(specialty.topics),
            "content_count": int(content_counts.get(specialty.id, 0)),
            "exam_count": int(exam_counts.get(specialty.id, 0)),
        }
        for specialty in specialties
    ]


@router.get("/library/specialties/{slug}", response_model=SpecialtyDetailOut)
async def get_specialty_detail(
    slug: str,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    stmt = (
        select(Specialty)
        .options(
            selectinload(Specialty.topics),
            selectinload(Specialty.contents).selectinload(ContentItem.topic),
        )
        .where(Specialty.slug == slug)
    )
    specialty = await db.scalar(stmt)
    if not specialty:
        raise HTTPException(status_code=404, detail="Especialidade não encontrada.")

    exams_q = await db.execute(
        select(Exam).where(Exam.specialty_id == specialty.id).order_by(Exam.title.asc())
    )
    exams = exams_q.scalars().all()
    question_counts = (
        {
            exam_id: count
            for exam_id, count in (
                await db.execute(
                    select(Question.exam_id, func.count())
                    .where(Question.exam_id.in_([exam.id for exam in exams]))
                    .group_by(Question.exam_id)
                )
            ).all()
        }
        if exams
        else {}
    )
    progress_q = await db.execute(
        select(ContentProgress.content_id, ContentProgress.completed).where(
            ContentProgress.user_id == user.id
        )
    )
    progress_map = {content_id: completed for content_id, completed in progress_q.all()}

    return {
        "id": specialty.id,
        "name": specialty.name,
        "slug": specialty.slug,
        "description": specialty.description,
        "topics": [
            {
                "id": topic.id,
                "title": topic.title,
                "slug": topic.slug,
                "description": topic.description,
            }
            for topic in sorted(specialty.topics, key=lambda item: item.order_index)
        ],
        "contents": [
            {
                "id": content.id,
                "title": content.title,
                "slug": content.slug,
                "summary": content.summary,
                "estimated_minutes": content.estimated_minutes,
                "topic_title": content.topic.title,
                "completed": bool(progress_map.get(content.id, False)),
            }
            for content in specialty.contents
            if content.is_published
        ],
        "exams": [
            {
                "id": exam.id,
                "title": exam.title,
                "description": exam.description,
                "time_limit_minutes": exam.time_limit_minutes,
                "question_count": int(question_counts.get(exam.id, 0)),
            }
            for exam in exams
        ],
    }


@router.get("/contents/{content_id}", response_model=ContentDetailOut)
async def get_content_detail(
    content_id: UUID,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    stmt = (
        select(ContentItem)
        .options(
            selectinload(ContentItem.topic),
            selectinload(ContentItem.subtopic),
            selectinload(ContentItem.specialty),
        )
        .where(ContentItem.id == content_id, ContentItem.is_published.is_(True))
    )
    content = await db.scalar(stmt)
    if not content:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")

    progress = await db.scalar(
        select(ContentProgress).where(
            ContentProgress.user_id == user.id,
            ContentProgress.content_id == content.id,
        )
    )
    return {
        "id": content.id,
        "title": content.title,
        "slug": content.slug,
        "summary": content.summary,
        "body": content.body,
        "estimated_minutes": content.estimated_minutes,
        "specialty_name": content.specialty.name,
        "topic": {
            "id": content.topic.id,
            "title": content.topic.title,
            "slug": content.topic.slug,
            "description": content.topic.description,
        },
        "subtopic": (
            {
                "id": content.subtopic.id,
                "title": content.subtopic.title,
                "slug": content.subtopic.slug,
                "description": content.subtopic.description,
            }
            if isinstance(content.subtopic, Subtopic)
            else None
        ),
        "completed": progress.completed if progress else False,
        "minutes_spent": progress.minutes_spent if progress else 0,
    }


@router.post("/contents/{content_id}/progress")
async def set_content_progress(
    content_id: UUID,
    body: ContentProgressIn,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    exists = await db.scalar(select(ContentItem.id).where(ContentItem.id == content_id))
    if not exists:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
    progress = await upsert_content_progress(
        db,
        user_id=user.id,
        content_id=content_id,
        completed=body.completed,
        minutes_spent=body.minutes_spent,
    )
    return {
        "content_id": progress.content_id,
        "completed": progress.completed,
        "minutes_spent": progress.minutes_spent,
        "completed_at": progress.completed_at,
    }


@router.get("/study-plan/current", response_model=StudyPlanOut | None)
async def current_study_plan(
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    plan = await get_current_study_plan(db, user)
    return serialize_study_plan(plan)


@router.post("/study-plan/generate", response_model=StudyPlanOut)
async def create_study_plan(
    body: StudyPlanCreateIn,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    plan = await generate_study_plan(
        db,
        user,
        goal=body.goal,
        weekly_hours=body.weekly_hours,
        specialty_slug=body.specialty_slug,
    )
    return serialize_study_plan(plan)
