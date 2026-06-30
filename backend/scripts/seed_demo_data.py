import asyncio
from datetime import datetime, timedelta
import random
import uuid
import os

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.financial_data_source import FinancialDataSource
from app.models.user import User


async def seed_demo_account():
    async with AsyncSessionLocal() as db:
        # Find demo user
        result = await db.execute(
            select(User).where(User.email == 'demo@solvai.com')
        )
        user = result.scalar_one_or_none()
        if not user:
            print("Demo user not found")
            return
        
        # Generate 12 months of realistic transaction data
        base_revenue = 7200
        monthly_data = []
        for i in range(12):
            month_date = datetime.now() - timedelta(days=30*(11-i))
            # Add seasonal variation and some randomness
            seasonal_factor = 1.0 + 0.3 * (
                1 if month_date.month in [6,7,8] else 0
            )
            variance = random.uniform(0.85, 1.15)
            revenue = round(
                base_revenue * seasonal_factor * variance, 2
            )
            monthly_data.append({
                'month': month_date.strftime('%Y-%m'),
                'revenue': revenue,
                'transactions': random.randint(6, 14)
            })
            
        total_transactions = sum(m['transactions'] for m in monthly_data)
        
        # Remove any existing demo source to prevent duplicates
        existing_sources = await db.execute(
            select(FinancialDataSource).where(
                FinancialDataSource.user_id == user.id,
                FinancialDataSource.type == 'STRIPE'
            )
        )
        for src in existing_sources.scalars().all():
            if src.connection_details.get('demo_mode'):
                print(f"Deleting old demo data source: {src.id}")
                await db.delete(src)
        await db.commit()

        # Create a mock Stripe data source with this data
        source = FinancialDataSource(
            id=uuid.uuid4(),
            organization_id=user.organization_id,
            user_id=user.id,
            type='STRIPE',
            status='CONNECTED',
            connection_details={
                'demo_mode': True,
                'name': 'Stripe (Demo)',
                'last_sync': datetime.utcnow().isoformat(),
                'records_count': total_transactions,
                'monthly_revenue_series': monthly_data,
                'currency': 'EUR',
                'client_concentration': {
                    'total_clients': 8,
                    'top_client_pct': 22.5,
                    'top_3_clients_pct': 48.0
                }
            }
        )
        db.add(source)
        await db.commit()
        print(f"Seeded demo data source: {source.id}")
        print(f"Total transactions: {total_transactions}")

if __name__ == '__main__':
    asyncio.run(seed_demo_account())
