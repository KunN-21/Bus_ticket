import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    REDIS_USERNAME: str = os.getenv("REDIS_USERNAME", "default")
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    
    # MongoDB
    MONGO_URL: str = os.getenv("MONGO_URL", "")
    MONGO_DB: str = os.getenv("MONGO_DB", "BookingTicket")
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Booking Ticket API"
    
    class Config:
        case_sensitive = True

settings = Settings()
