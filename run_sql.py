import asyncio
import asyncpg
import urllib.parse
import os

async def main():
    # Read the DATABASE_URL environment variable which is mounted from Secret Manager
    db_url = os.environ.get('DATABASE_URL')
    conn = await asyncpg.connect(db_url)
    
    await conn.execute('''
        UPDATE organizations
        SET plan = 'pro',
            status = 'active',
            current_period_end = '2099-12-31'::date
        WHERE id = (
            SELECT organization_id FROM users
            WHERE email = 'demo@solvai.com'
        );
    ''')
    print("SUCCESS: Demo account upgraded to PRO")
    await conn.close()

asyncio.run(main())
