"""
Define DATABASE_URL antes de importar a aplicação.

Requer PostgreSQL com pgvector e o banco `doctor_mind_test` (veja docker/postgres-init).
Imports de Starlette/httpx são adiados para evitar bloqueios em alguns ambientes.
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from starlette.testclient import TestClient

os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://doctor:doctor@localhost:5432/doctor_mind_test",
    ),
)
os.environ.setdefault("DATABASE_CONNECT_TIMEOUT", "12")


def pytest_configure() -> None:
    os.environ.setdefault(
        "DATABASE_URL",
        os.environ.get(
            "TEST_DATABASE_URL",
            "postgresql+asyncpg://doctor:doctor@localhost:5432/doctor_mind_test",
        ),
    )


@pytest.fixture(scope="session")
def client():
    from starlette.testclient import TestClient

    from app.main import app

    with TestClient(app) as tc:
        yield tc


@pytest.fixture
def exam_ids(client):
    slug = "clinica-medica"
    r2 = client.get(f"/api/exams/specialties/{slug}/exams")
    assert r2.status_code == 200, r2.text
    exams = r2.json()
    assert len(exams) >= 1
    return {"slug": slug, "exam_id": exams[0]["id"]}
