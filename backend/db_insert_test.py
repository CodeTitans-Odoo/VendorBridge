import asyncio
import sys
import os

sys.path.append(r"d:\VendorBridge\backend")
os.chdir(r"d:\VendorBridge\backend")

from app.db.database import get_db, AsyncSessionLocal
from app.db.models import Vendor
from app.core.security import hash_password

async def test_insert():
    async with AsyncSessionLocal() as db:
        try:
            vendor = Vendor(
                name="Vendor2 User2",
                category="Category A",
                email="vendor_company2@vendorbridge.com",
                phone_number="9876543210",
                status="Active",
                password_hash=hash_password("Password123")
            )
            db.add(vendor)
            await db.commit()
            print("Successfully inserted vendor!")
        except Exception as e:
            print(f"Exception during insert: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_insert())
