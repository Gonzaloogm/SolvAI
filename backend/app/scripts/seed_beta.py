import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

from app.core.config import settings
from app.models.user import User
from app.models.organization import Organization
from app.services import auth_service

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as db:
        print("Starting DB Seed Script...")
        
        # 1. Upgrade demo@solvai.com
        res = await db.execute(select(User).where(User.email == "demo@solvai.com"))
        demo_user = res.scalar_one_or_none()
        
        if demo_user:
            res_org = await db.execute(select(Organization).where(Organization.id == demo_user.organization_id))
            demo_org = res_org.scalar_one_or_none()
            if demo_org:
                demo_org.plan = "pro"
                demo_org.status = "active"
                demo_org.current_period_end = datetime(2099, 12, 31, 23, 59, 59)
                db.add(demo_org)
                print(f"Upgraded demo@solvai.com (Org: {demo_org.id}) to pro")
        else:
            print("demo@solvai.com not found. Skipping.")
            
        # 2. Create 5 beta accounts
        beta_emails = [f"beta{i}@solvai.com" for i in range(1, 6)]
        for email in beta_emails:
            # Check if user already exists
            res = await db.execute(select(User).where(User.email == email))
            existing_user = res.scalar_one_or_none()
            
            if existing_user:
                print(f"{email} already exists. Upgrading their organization to pro.")
                res_org = await db.execute(select(Organization).where(Organization.id == existing_user.organization_id))
                org = res_org.scalar_one_or_none()
                if org:
                    org.plan = "pro"
                    org.status = "active"
                    org.current_period_end = datetime(2099, 12, 31, 23, 59, 59)
                    db.add(org)
            else:
                try:
                    org, user = await auth_service.register_user(
                        db=db,
                        email=email,
                        password="SolvAI2026beta!",
                        org_name=f"Beta Tester ({email})"
                    )
                    org.plan = "pro"
                    org.status = "active"
                    org.current_period_end = datetime(2099, 12, 31, 23, 59, 59)
                    db.add(org)
                    print(f"Created and upgraded {email}")
                except Exception as e:
                    print(f"Failed to create {email}: {e}")
        
        await db.commit()
        print("Script execution completed!")

if __name__ == "__main__":
    asyncio.run(main())
