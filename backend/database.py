import redis.asyncio as redis
from config import settings
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

# Redis Connection
class RedisClient:
    def __init__(self):
        self.client = None
    
    async def connect(self):
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            username=settings.REDIS_USERNAME,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
        print("✅ Redis connected successfully")
    
    async def disconnect(self):
        if self.client:
            await self.client.close()
            print("❌ Redis disconnected")
    
    def get_client(self):
        return self.client

redis_client = RedisClient()

# MongoDB Connection
class MongoDBClient:
    def __init__(self):
        self.client = None
        self.db = None
    
    async def connect(self):
        self.client = AsyncIOMotorClient(
            settings.MONGO_URL,
            tlsCAFile=certifi.where()
        )
        self.db = self.client[settings.MONGO_DB]
        # Test connection
        await self.client.admin.command('ping')
        print("✅ MongoDB connected successfully")
    
    async def disconnect(self):
        if self.client:
            self.client.close()
            print("❌ MongoDB disconnected")
    
    def get_db(self):
        return self.db

mongodb_client = MongoDBClient()