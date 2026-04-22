import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.all import User
from app.core.security import get_password_hash

async def create_admin():
    async with AsyncSessionLocal() as db:
        admin_email = "admin@cyderes.com"
        # Check if exists
        from sqlalchemy.future import select
        res = await db.execute(select(User).where(User.email == admin_email))
        if res.scalars().first():
            print("Admin already exists")
            return
            
        hashed_password = get_password_hash("cyderes123")
        admin = User(
            email=admin_email,
            name="Cyderes Admin",
            hashed_password=hashed_password,
            role="admin",
            is_verified=True
        )
        db.add(admin)
        await db.commit()
        print("Admin created: admin@cyderes.com / cyderes123")

if __name__ == "__main__":
    asyncio.run(create_admin())
