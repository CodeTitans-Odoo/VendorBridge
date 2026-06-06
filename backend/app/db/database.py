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
    """Create all tables by strictly executing SQL.txt."""
    import os
    import re
    from sqlalchemy import text

    # Locate SQL.txt in the root of the project
    base_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    )
    sql_path = os.path.join(base_dir, "SQL.txt")

    try:
        with open(sql_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract SQL between ```sql and ```
        match = re.search(r"```sql(.*?)```", content, re.DOTALL)
        if match:
            sql_script = match.group(1).strip()
        else:
            sql_script = content

        # Split SQL by semicolons, filtering out comments and empty statements
        statements = []
        for stmt in sql_script.split(";"):
            clean_stmt = ""
            for line in stmt.split("\n"):
                if not line.strip().startswith("--"):
                    clean_stmt += line + "\n"
            clean_stmt = clean_stmt.strip()
            if clean_stmt:
                statements.append(clean_stmt)

        async with engine.begin() as conn:
            for stmt in statements:
                try:
                    await conn.execute(text(stmt))
                except Exception as e:
                    # Ignore if table/constraint already exists
                    if "already exists" in str(e).lower():
                        continue
                    raise e
            print("Successfully executed SQL.txt schema.")
    except Exception as e:
        print(f"Failed to execute SQL.txt: {e}")
