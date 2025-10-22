import asyncio
import os
import redis.asyncio as redis
from dotenv import load_dotenv

load_dotenv()

# Lấy thông tin Redis từ .env
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT", 10134))
REDIS_USERNAME = os.getenv("REDIS_USERNAME")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

# Kết nối Redis
r = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True,
    username=REDIS_USERNAME,
    password=REDIS_PASSWORD,
)

async def test_redis():
    try:
        await r.set("test_key", "Hello Nam 🚀")
        val = await r.get("test_key")
        print("Redis connected successfully:", val)
    except Exception as e:
        print("Redis connection error:", e)

# Test
asyncio.run(test_redis())
