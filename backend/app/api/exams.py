from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_active_subscription
from app.database import get_session
from app.models.domain import Exam, ExamAttempt, ExamAttemptAnswer, Question, Specialty, User
from app.schemas.exams import (
    AnswerIn,
    AnswerResultItem,
    AnswerResultOut,
    ExamDetailOut,
    ExamSummaryOut,
    QuestionOut,
    SpecialtyOut,
)

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("/specialties", response_model=list[SpecialtyOut])
async def list_specialties(
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    del user
    r = await db.execute(select(Specialty).order_by(Specialty.name))
    return [SpecialtyOut.model_validate(x) for x in r.scalars().all()]


@router.get(
    "/specialties/{slug}/exams",
    response_model=list[ExamSummaryOut],
)
async def list_exams_by_specialty(
    slug: str,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    del user
    spec = await db.scalar(select(Specialty).where(Specialty.slug == slug))
    if not spec:
        raise HTTPException(status_code=404, detail="Especialidade não encontrada")

    subq = (
        select(Question.exam_id, func.count().label("qc"))
        .group_by(Question.exam_id)
        .subquery()
    )
    r = await db.execute(
        select(Exam, subq.c.qc)
        .outerjoin(subq, subq.c.exam_id == Exam.id)
        .where(Exam.specialty_id == spec.id)
        .order_by(Exam.title)
    )
    out: list[ExamSummaryOut] = []
    for exam, qc in r.all():
        out.append(
            ExamSummaryOut(
                id=exam.id,
                title=exam.title,
                description=exam.description,
                time_limit_minutes=exam.time_limit_minutes,
                question_count=int(qc or 0),
            )
        )
    return out


@router.get("/{exam_id}", response_model=ExamDetailOut)
async def get_exam(
    exam_id: UUID,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    del user
    r = await db.execute(
        select(Exam)
        .options(selectinload(Exam.specialty), selectinload(Exam.questions))
        .where(Exam.id == exam_id)
    )
    exam = r.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Prova não encontrada")

    questions = sorted(exam.questions, key=lambda q: q.order_index)
    return ExamDetailOut(
        id=exam.id,
        title=exam.title,
        description=exam.description,
        time_limit_minutes=exam.time_limit_minutes,
        specialty=SpecialtyOut.model_validate(exam.specialty),
        questions=[
            QuestionOut(
                id=q.id,
                prompt=q.prompt,
                options=list(q.options) if isinstance(q.options, list) else [],
                order_index=q.order_index,
            )
            for q in questions
        ],
    )


@router.post("/{exam_id}/submit", response_model=AnswerResultOut)
async def submit_exam(
    exam_id: UUID,
    body: AnswerIn,
    user: User = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_session),
):
    r = await db.execute(
        select(Exam)
        .options(selectinload(Exam.questions))
        .where(Exam.id == exam_id)
    )
    exam = r.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Prova não encontrada")

    questions = sorted(exam.questions, key=lambda q: q.order_index)
    if len(body.answers) != len(questions):
        raise HTTPException(
            status_code=400,
            detail="Número de respostas diferente do número de questões.",
        )

    items: list[AnswerResultItem] = []
    correct_n = 0
    for q, ans in zip(questions, body.answers, strict=True):
        ok = int(ans) == int(q.correct_index)
        if ok:
            correct_n += 1
        items.append(
            AnswerResultItem(
                question_id=q.id,
                correct=ok,
                correct_index=q.correct_index,
                explanation=q.explanation,
            )
        )

    total = len(questions)
    score = (correct_n / total * 100.0) if total else 0.0
    attempt = ExamAttempt(
        user_id=user.id,
        exam_id=exam.id,
        score=round(score, 1),
        total_questions=total,
        correct_answers=correct_n,
    )
    db.add(attempt)
    await db.flush()
    for q, ans in zip(questions, body.answers, strict=True):
        db.add(
            ExamAttemptAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_index=int(ans),
                correct=int(ans) == int(q.correct_index),
            )
        )
    await db.commit()
    return AnswerResultOut(score=round(score, 1), total=total, items=items)
