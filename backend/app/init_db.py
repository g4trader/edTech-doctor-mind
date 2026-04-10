from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base, engine, async_session_factory
from app.seed import seed_demo_content


async def init_models() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)


async def bootstrap_data() -> None:
    async with async_session_factory() as session:
        assert isinstance(session, AsyncSession)
        await seed_demo_content(session)
