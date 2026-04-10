from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import bearer_scheme, get_current_user
from app.database import get_session
from app.models.domain import SubscriptionPlan, User
from app.schemas.auth import AuthResponseOut, LoginIn, MeOut, RegisterIn
from app.services.auth import (
    create_user,
    ensure_basic_subscription,
    get_active_subscription_from_user,
    get_user_by_email,
    issue_token,
    revoke_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _serialize_subscription(subscription):
    if not subscription:
        return None
    return {
        "id": subscription.id,
        "status": subscription.status,
        "started_at": subscription.started_at,
        "ends_at": subscription.ends_at,
        "plan": {
            "id": subscription.plan.id,
            "code": subscription.plan.code,
            "name": subscription.plan.name,
            "description": subscription.plan.description,
            "price_cents": subscription.plan.price_cents,
            "billing_cycle": subscription.plan.billing_cycle,
        },
    }


def _serialize_user(user: User):
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "is_admin": user.is_admin,
        "created_at": user.created_at,
    }


@router.post("/register", response_model=AuthResponseOut)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_session)):
    if await get_user_by_email(db, body.email):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado.")

    plan = await db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.code == "basic"))
    if not plan:
        raise HTTPException(status_code=500, detail="Plano básico não configurado.")

    user = await create_user(
        db,
        full_name=body.full_name,
        email=body.email,
        password=body.password,
    )
    await ensure_basic_subscription(db, user, plan)
    token = await issue_token(db, user)
    await db.commit()
    user = await get_user_by_email(db, body.email)
    assert user is not None
    active_subscription = get_active_subscription_from_user(user)
    return {
        "token": token.token,
        "user": _serialize_user(user),
        "subscription": _serialize_subscription(active_subscription),
    }


@router.post("/login", response_model=AuthResponseOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_session)):
    user = await get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas.",
        )
    token = await issue_token(db, user)
    await db.commit()
    user = await get_user_by_email(db, body.email)
    assert user is not None
    active_subscription = get_active_subscription_from_user(user)
    return {
        "token": token.token,
        "user": _serialize_user(user),
        "subscription": _serialize_subscription(active_subscription),
    }


@router.get("/me", response_model=MeOut)
async def me(user: User = Depends(get_current_user)):
    active_subscription = get_active_subscription_from_user(user)
    return {
        "user": _serialize_user(user),
        "subscription": _serialize_subscription(active_subscription),
    }


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    del user
    if credentials:
        await revoke_token(db, credentials.credentials)
    response.status_code = 204
