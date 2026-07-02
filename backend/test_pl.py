import asyncio
import sys

from app.api.reports import get_pl_statement_pdf

async def main():
    try:
        response = await get_pl_statement_pdf(12)
        print("Success! PDF generated with size:", len(response.body))
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
