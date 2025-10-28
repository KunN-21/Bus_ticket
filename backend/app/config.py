import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    REDIS_USERNAME: str = os.getenv("REDIS_USERNAME", "default")
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD")
    
    # MongoDB
    MONGO_URL: str = os.getenv("MONGO_URL")
    MONGO_DB: str = os.getenv("MONGO_DB", "BookingTicket")

    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")

    # SMTP Email Settings
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_EMAIL: str = os.getenv("SMTP_EMAIL")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Booking Ticket API"
    
    class Config:
        case_sensitive = True

settings = Settings()
