from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_active_subscription
from app.database import get_session
from app.models.domain import (
    CohortEnrollment,
    MentorshipCohort,
    MentorshipProduct,
    User,
)
from app.schemas.mentorships import MentorshipCohortOut

router = APIRouter(prefix="/mentorships", tags=["mentorships"])


def _cohort_to_out(cohort: MentorshipCohort, *, viewer_enrolled: bool):
    seats_left = max(0, cohort.capacity - len(cohort.enrollments))
    return {
        "id": cohort.id,
        "title": cohort.title,
        "status": cohort.status,
        "starts_at": cohort.starts_at,
        "ends_at": cohort.ends_at,
        "capacity": cohort.capacity,
        "seats_left": seats_left,
        "meeting_url": cohort.meeting_url if viewer_enrolled else None,
        "access_instructions": cohort.access_instructions if viewer_enrolled else None,
        "viewer_enrolled": viewer_enrolled,
        "product": {
            "id": cohort.product.id,
            "title": cohort.product.title,
            "slug": cohort.product.slug,
            "summary": cohort.product.summary,
            "description": cohort.product.description,
            "price_cents": cohort.product.price_cents,
            "specialty_name": cohort.product.specialty.name
            if cohort.product.specialty
            else None,
            "mentor": {
                "id": cohort.product.mentor.id,
                "name": cohort.product.mentor.name,
                "slug": cohort.product.mentor.slug,
                "title": cohort.product.mentor.title,
                "bio": cohort.product.mentor.bio,
            },
        },
    }


@router.get("/cohorts", response_model=list[MentorshipCohortOut])
async def list_cohorts(
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    stmt = (
        select(MentorshipCohort)
        .options(
            selectinload(MentorshipCohort.product).selectinload(MentorshipProduct.mentor),
            selectinload(MentorshipCohort.product).selectinload(
                MentorshipProduct.specialty
            ),
            selectinload(MentorshipCohort.enrollments),
        )
        .order_by(MentorshipCohort.starts_at.asc())
    )
    cohorts = (await db.execute(stmt)).scalars().all()
    return [
        _cohort_to_out(
            cohort,
            viewer_enrolled=any(
                enrollment.user_id == user.id and enrollment.status == "confirmed"
                for enrollment in cohort.enrollments
            ),
        )
        for cohort in cohorts
    ]


@router.post("/cohorts/{cohort_id}/enroll", response_model=MentorshipCohortOut)
async def enroll_in_cohort(
    cohort_id: UUID,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    stmt = (
        select(MentorshipCohort)
        .options(
            selectinload(MentorshipCohort.product).selectinload(MentorshipProduct.mentor),
            selectinload(MentorshipCohort.product).selectinload(
                MentorshipProduct.specialty
            ),
            selectinload(MentorshipCohort.enrollments),
        )
        .where(MentorshipCohort.id == cohort_id)
    )
    cohort = await db.scalar(stmt)
    if not cohort:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")

    for enrollment in cohort.enrollments:
        if enrollment.user_id == user.id and enrollment.status == "confirmed":
            return _cohort_to_out(cohort, viewer_enrolled=True)

    if len(cohort.enrollments) >= cohort.capacity:
        raise HTTPException(status_code=409, detail="Turma sem vagas disponíveis.")

    db.add(CohortEnrollment(cohort_id=cohort.id, user_id=user.id, status="confirmed"))
    await db.commit()

    cohort = await db.scalar(stmt)
    assert cohort is not None
    return _cohort_to_out(cohort, viewer_enrolled=True)
