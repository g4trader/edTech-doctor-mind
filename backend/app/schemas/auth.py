from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class RegisterIn(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=160)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=120)


class LoginIn(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=120)


class SubscriptionPlanOut(BaseModel):
    id: UUID
    code: str
    name: str
    description: str | None
    price_cents: int
    billing_cycle: str


class SubscriptionOut(BaseModel):
    id: UUID
    status: str
    started_at: datetime
    ends_at: datetime | None
    plan: SubscriptionPlanOut


class UserOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    is_admin: bool
    created_at: datetime


class AuthResponseOut(BaseModel):
    token: str
    user: UserOut
    subscription: SubscriptionOut | None


class MeOut(BaseModel):
    user: UserOut
    subscription: SubscriptionOut | None
