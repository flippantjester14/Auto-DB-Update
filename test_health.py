import asyncio
import httpx

async def test_health():
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://localhost:8000/health")
        print(resp.json())

if __name__ == "__main__":
    asyncio.run(test_health())
