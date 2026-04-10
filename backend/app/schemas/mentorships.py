from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MentorOut(BaseModel):
    id: UUID
    name: str
    slug: str
    title: str
    bio: str


class MentorshipProductOut(BaseModel):
    id: UUID
    title: str
    slug: str
    summary: str
    description: str
    price_cents: int
    specialty_name: str | None
    mentor: MentorOut


class MentorshipCohortOut(BaseModel):
    id: UUID
    title: str
    status: str
    starts_at: datetime
    ends_at: datetime
    capacity: int
    seats_left: int
    meeting_url: str | None
    access_instructions: str | None
    viewer_enrolled: bool
    product: MentorshipProductOut

