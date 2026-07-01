import asyncio
import asyncpg
import urllib.parse

async def main():
    pwd = urllib.parse.quote_plus('8j4gZ/fG93alcj4RukELejzD8Bf6/yaw')
    conn = await asyncpg.connect(f'postgresql://solvai:{pwd}@127.0.0.1:5432/solvai')
    
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
    print("Demo account upgraded to PRO")
    await conn.close()

asyncio.run(main())
