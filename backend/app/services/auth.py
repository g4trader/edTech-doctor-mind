import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.domain import AuthToken, Subscription, SubscriptionPlan, User


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()
    return f"{salt}${derived}"


def verify_password(password: str, stored_hash: str) -> bool:
    salt, expected = stored_hash.split("$", maxsplit=1)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()
    return hmac.compare_digest(derived, expected)


def utcnow() -> datetime:
    return datetime.now(UTC)


def is_subscription_active(subscription: Subscription | None) -> bool:
    if not subscription or subscription.status != "active":
        return False
    return subscription.ends_at is None or subscription.ends_at > utcnow()


def get_active_subscription_from_user(user: User) -> Subscription | None:
    active = [sub for sub in user.subscriptions if is_subscription_active(sub)]
    if not active:
        return None
    return sorted(active, key=lambda item: item.started_at, reverse=True)[0]


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    stmt = (
        select(User)
        .options(selectinload(User.subscriptions).selectinload(Subscription.plan))
        .where(User.email == email.lower().strip())
    )
    return await session.scalar(stmt)


async def create_user(
    session: AsyncSession,
    *,
    full_name: str,
    email: str,
    password: str,
    is_admin: bool = False,
) -> User:
    user = User(
        full_name=full_name.strip(),
        email=email.lower().strip(),
        password_hash=hash_password(password),
        is_admin=is_admin,
    )
    session.add(user)
    await session.flush()
    return user


async def issue_token(
    session: AsyncSession,
    user: User,
    *,
    expires_in_days: int = 30,
) -> AuthToken:
    token = AuthToken(
        user_id=user.id,
        token=secrets.token_urlsafe(32),
        expires_at=utcnow() + timedelta(days=expires_in_days),
    )
    session.add(token)
    await session.flush()
    return token


async def revoke_token(session: AsyncSession, raw_token: str) -> None:
    token = await session.scalar(select(AuthToken).where(AuthToken.token == raw_token))
    if token and token.revoked_at is None:
        token.revoked_at = utcnow()
        await session.commit()


async def get_user_from_token(session: AsyncSession, raw_token: str) -> User | None:
    stmt = (
        select(AuthToken)
        .options(
            selectinload(AuthToken.user)
            .selectinload(User.subscriptions)
            .selectinload(Subscription.plan)
        )
        .where(AuthToken.token == raw_token)
    )
    token = await session.scalar(stmt)
    if not token or token.revoked_at is not None or token.expires_at <= utcnow():
        return None
    return token.user


async def ensure_basic_subscription(
    session: AsyncSession, user: User, plan: SubscriptionPlan
) -> Subscription:
    if user.subscriptions:
        active = get_active_subscription_from_user(user)
        if active:
            return active

    subscription = Subscription(user_id=user.id, plan_id=plan.id, status="active")
    session.add(subscription)
    await session.flush()
    return subscription

