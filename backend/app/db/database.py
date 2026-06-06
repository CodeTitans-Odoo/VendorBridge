"""
Async SQLAlchemy engine + session factory.
DATABASE_URL must be set in .env, e.g.:
  postgresql+asyncpg://user:password@host:5432/dbname
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables() -> None:
    """Create all tables using SQLAlchemy's metadata.create_all to ensure cross-database compatibility (e.g. SQLite handles BIGSERIAL as INTEGER properly)."""
    import app.db.models  # Ensure models are registered
    
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            print("Successfully created database tables using SQLAlchemy.")
    except Exception as e:
        print(f"Failed to create database tables: {e}")
