import asyncio
import sys
sys.path.insert(0, '/Users/yashvitrivedi/VendorBridge/VendorBridge/backend')

async def make_admin():
    import asyncpg
    conn = await asyncpg.connect('postgresql://postgres:Yash2510@localhost:5432/postgres')
    try:
        # Show all users
        rows = await conn.fetch("SELECT id, email, first_name, last_name, role FROM company_employees ORDER BY id")
        print("All users:")
        for r in rows:
            print(f"  id={r['id']}, email={r['email']}, role={r['role']}, name={r['first_name']} {r['last_name']}")
        
        if rows:
            last = rows[-1]
            result = await conn.fetchrow(
                "UPDATE company_employees SET role='admin' WHERE id=$1 RETURNING id, email, role",
                last['id']
            )
            print(f"\nUpdated: {dict(result)}")
    finally:
        await conn.close()

asyncio.run(make_admin())
