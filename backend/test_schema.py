import asyncio, traceback
from app.db.database import engine, Base
import app.db.models

async def main():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("SUCCESS")
    except Exception as e:
        traceback.print_exc()

asyncio.run(main())
