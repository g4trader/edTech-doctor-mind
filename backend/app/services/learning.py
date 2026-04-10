from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.domain import (
    CohortEnrollment,
    ContentItem,
    ContentProgress,
    Exam,
    ExamAttempt,
    ExamAttemptAnswer,
    MentorshipCohort,
    MentorshipProduct,
    QuestionTopicLink,
    Specialty,
    StudyPlan,
    StudyPlanItem,
    Topic,
    User,
)


def _gap_level(score: float) -> str:
    if score >= 80:
        return "baixo"
    if score >= 60:
        return "moderado"
    return "alto"


async def build_proficiency(
    session: AsyncSession, user: User
) -> list[dict[str, object]]:
    attempts_stmt = (
        select(
            Specialty.slug,
            Specialty.name,
            ExamAttempt.score,
        )
        .join(Exam, Exam.id == ExamAttempt.exam_id)
        .join(Specialty, Specialty.id == Exam.specialty_id)
        .where(ExamAttempt.user_id == user.id)
    )
    attempt_rows = (await session.execute(attempts_stmt)).all()

    per_specialty: dict[str, dict[str, object]] = {}
    for slug, name, score in attempt_rows:
        bucket = per_specialty.setdefault(
            slug,
            {
                "specialty_slug": slug,
                "specialty_name": name,
                "attempts": 0,
                "score_sum": 0.0,
                "topics": [],
            },
        )
        bucket["attempts"] = int(bucket["attempts"]) + 1
        bucket["score_sum"] = float(bucket["score_sum"]) + float(score)

    topic_stmt = (
        select(
            Specialty.slug,
            Topic.title,
            func.count(ExamAttemptAnswer.id),
            func.sum(
                case((ExamAttemptAnswer.correct.is_(True), 1), else_=0)
            ).label("correct_count"),
        )
        .join(Exam, Exam.specialty_id == Specialty.id)
        .join(ExamAttempt, ExamAttempt.exam_id == Exam.id)
        .join(ExamAttemptAnswer, ExamAttemptAnswer.attempt_id == ExamAttempt.id)
        .join(QuestionTopicLink, QuestionTopicLink.question_id == ExamAttemptAnswer.question_id)
        .join(Topic, Topic.id == QuestionTopicLink.topic_id)
        .where(ExamAttempt.user_id == user.id)
        .group_by(Specialty.slug, Topic.title)
    )
    topic_rows = (await session.execute(topic_stmt)).all()
    for specialty_slug, topic_title, question_count, correct_count in topic_rows:
        bucket = per_specialty.setdefault(
            specialty_slug,
            {
                "specialty_slug": specialty_slug,
                "specialty_name": specialty_slug.replace("-", " ").title(),
                "attempts": 0,
                "score_sum": 0.0,
                "topics": [],
            },
        )
        qc = int(question_count or 0)
        cc = int(correct_count or 0)
        accuracy = round((cc / qc * 100.0) if qc else 0.0, 1)
        bucket["topics"].append(
            {
                "topic_title": topic_title,
                "question_count": qc,
                "correct_answers": cc,
                "accuracy": accuracy,
            }
        )

    output: list[dict[str, object]] = []
    for bucket in per_specialty.values():
        attempts = int(bucket["attempts"])
        average_score = round(
            float(bucket["score_sum"]) / attempts if attempts else 0.0,
            1,
        )
        output.append(
            {
                "specialty_slug": bucket["specialty_slug"],
                "specialty_name": bucket["specialty_name"],
                "attempts": attempts,
                "average_score": average_score,
                "gap_level": _gap_level(average_score),
                "topics": sorted(
                    bucket["topics"],
                    key=lambda item: (item["accuracy"], item["topic_title"]),
                ),
            }
        )

    output.sort(key=lambda item: item["specialty_name"])
    return output


async def get_current_study_plan(session: AsyncSession, user: User) -> StudyPlan | None:
    stmt = (
        select(StudyPlan)
        .options(
            selectinload(StudyPlan.items).selectinload(StudyPlanItem.content),
            selectinload(StudyPlan.items).selectinload(StudyPlanItem.topic),
            selectinload(StudyPlan.specialty),
        )
        .where(StudyPlan.user_id == user.id, StudyPlan.status == "active")
        .order_by(StudyPlan.created_at.desc())
    )
    return await session.scalar(stmt)


def serialize_study_plan(plan: StudyPlan | None) -> dict | None:
    if not plan:
        return None
    return {
        "id": plan.id,
        "title": plan.title,
        "goal": plan.goal,
        "weekly_hours": plan.weekly_hours,
        "status": plan.status,
        "specialty_name": plan.specialty.name if plan.specialty else None,
        "created_at": plan.created_at,
        "items": [
            {
                "id": item.id,
                "title": item.title,
                "day_label": item.day_label,
                "week_index": item.week_index,
                "estimated_minutes": item.estimated_minutes,
                "rationale": item.rationale,
                "content_id": item.content_id,
                "topic_title": item.topic.title if item.topic else None,
                "status": item.status,
            }
            for item in sorted(
                plan.items, key=lambda entry: (entry.week_index, entry.day_label)
            )
        ],
    }


async def build_dashboard(session: AsyncSession, user: User, subscription_name: str | None):
    total_contents = await session.scalar(
        select(func.count()).select_from(ContentItem).where(ContentItem.is_published.is_(True))
    )
    completed_contents = await session.scalar(
        select(func.count())
        .select_from(ContentProgress)
        .where(ContentProgress.user_id == user.id, ContentProgress.completed.is_(True))
    )
    attempts_total = await session.scalar(
        select(func.count()).select_from(ExamAttempt).where(ExamAttempt.user_id == user.id)
    )
    average_score = await session.scalar(
        select(func.avg(ExamAttempt.score)).where(ExamAttempt.user_id == user.id)
    )

    proficiency = await build_proficiency(session, user)
    plan = await get_current_study_plan(session, user)

    cohorts_stmt = (
        select(CohortEnrollment)
        .options(
            selectinload(CohortEnrollment.cohort)
            .selectinload(MentorshipCohort.product)
            .selectinload(MentorshipProduct.mentor)
        )
        .where(CohortEnrollment.user_id == user.id, CohortEnrollment.status == "confirmed")
        .order_by(CohortEnrollment.created_at.desc())
    )
    enrollments = (await session.execute(cohorts_stmt)).scalars().all()
    upcoming = []
    for enrollment in enrollments[:3]:
        cohort = enrollment.cohort
        upcoming.append(
            {
                "cohort_id": str(cohort.id),
                "title": cohort.title,
                "starts_at": cohort.starts_at.isoformat(),
                "mentor_name": cohort.product.mentor.name,
            }
        )

    return {
        "user_name": user.full_name,
        "active_subscription_name": subscription_name,
        "completed_contents": int(completed_contents or 0),
        "total_contents": int(total_contents or 0),
        "total_attempts": int(attempts_total or 0),
        "average_score": round(float(average_score or 0.0), 1),
        "proficiency": proficiency,
        "current_plan": serialize_study_plan(plan),
        "upcoming_mentorships": upcoming,
    }


async def generate_study_plan(
    session: AsyncSession,
    user: User,
    *,
    goal: str,
    weekly_hours: int,
    specialty_slug: str | None,
) -> StudyPlan:
    specialty = None
    if specialty_slug:
        specialty = await session.scalar(
            select(Specialty).where(Specialty.slug == specialty_slug)
        )

    old_plans = (
        await session.execute(
            select(StudyPlan).where(StudyPlan.user_id == user.id, StudyPlan.status == "active")
        )
    ).scalars().all()
    for old in old_plans:
        old.status = "archived"

    proficiency = await build_proficiency(session, user)
    weak_topics: list[str] = []
    if specialty:
        specialty_prof = next(
            (item for item in proficiency if item["specialty_slug"] == specialty.slug),
            None,
        )
        if specialty_prof:
            weak_topics = [
                topic["topic_title"]
                for topic in specialty_prof["topics"][:3]
            ]

    content_stmt = (
        select(ContentItem)
        .options(selectinload(ContentItem.topic), selectinload(ContentItem.specialty))
        .where(ContentItem.is_published.is_(True))
        .order_by(ContentItem.estimated_minutes.desc(), ContentItem.title.asc())
    )
    if specialty:
        content_stmt = content_stmt.where(ContentItem.specialty_id == specialty.id)
    contents = (await session.execute(content_stmt)).scalars().all()

    ranked_contents = sorted(
        contents,
        key=lambda item: (
            0 if item.topic.title in weak_topics else 1,
            item.estimated_minutes,
            item.title,
        ),
    )
    ranked_contents = ranked_contents[: min(6, len(ranked_contents))]

    title = (
        f"Plano guiado de {specialty.name}" if specialty else "Plano guiado multidisciplinar"
    )
    plan = StudyPlan(
        user_id=user.id,
        specialty_id=specialty.id if specialty else None,
        title=title,
        goal=goal.strip(),
        weekly_hours=weekly_hours,
        status="active",
    )
    session.add(plan)
    await session.flush()

    weekdays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    if ranked_contents:
        suggested_minutes = max(30, int((weekly_hours * 60) / len(ranked_contents)))
    else:
        suggested_minutes = max(30, weekly_hours * 60)

    if not ranked_contents and specialty:
        topic_stmt = (
            select(Topic)
            .where(Topic.specialty_id == specialty.id)
            .order_by(Topic.order_index.asc(), Topic.title.asc())
        )
        topics = (await session.execute(topic_stmt)).scalars().all()[:3]
        for index, topic in enumerate(topics, start=1):
            session.add(
                StudyPlanItem(
                    plan_id=plan.id,
                    topic_id=topic.id,
                    title=f"Revisar fundamentos de {topic.title}",
                    rationale="Tema priorizado para consolidar base teórica antes de novas avaliações.",
                    week_index=1,
                    day_label=weekdays[(index - 1) % len(weekdays)],
                    estimated_minutes=suggested_minutes,
                )
            )
    else:
        for index, content in enumerate(ranked_contents, start=1):
            rationale = (
                "Tema com maior oportunidade de ganho segundo seu desempenho recente."
                if content.topic.title in weak_topics
                else "Conteúdo selecionado para sustentar progressão contínua da trilha."
            )
            session.add(
                StudyPlanItem(
                    plan_id=plan.id,
                    topic_id=content.topic_id,
                    content_id=content.id,
                    title=content.title,
                    rationale=rationale,
                    week_index=1 if index <= 3 else 2,
                    day_label=weekdays[(index - 1) % len(weekdays)],
                    estimated_minutes=max(suggested_minutes, content.estimated_minutes),
                )
            )

    await session.commit()
    refreshed = await session.scalar(
        select(StudyPlan)
        .options(
            selectinload(StudyPlan.items).selectinload(StudyPlanItem.content),
            selectinload(StudyPlan.items).selectinload(StudyPlanItem.topic),
            selectinload(StudyPlan.specialty),
        )
        .where(StudyPlan.id == plan.id)
    )
    assert refreshed is not None
    return refreshed


async def upsert_content_progress(
    session: AsyncSession,
    *,
    user_id: UUID,
    content_id: UUID,
    completed: bool,
    minutes_spent: int,
) -> ContentProgress:
    stmt = select(ContentProgress).where(
        ContentProgress.user_id == user_id,
        ContentProgress.content_id == content_id,
    )
    progress = await session.scalar(stmt)
    now = datetime.now(UTC)
    if not progress:
        progress = ContentProgress(
            user_id=user_id,
            content_id=content_id,
            completed=completed,
            minutes_spent=minutes_spent,
            completed_at=now if completed else None,
            last_opened_at=now,
        )
        session.add(progress)
    else:
        progress.completed = completed
        progress.minutes_spent = minutes_spent
        progress.completed_at = now if completed else None
        progress.last_opened_at = now

    await session.commit()
    await session.refresh(progress)
    return progress
