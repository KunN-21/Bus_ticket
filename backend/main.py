from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import redis_client, mongodb_client
from config import settings
from routes import tickets, bookings, users, payments

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await redis_client.connect()
    await mongodb_client.connect()
    yield
    # Shutdown
    await redis_client.disconnect()
    await mongodb_client.disconnect()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(tickets.router, prefix=f"{settings.API_V1_STR}/tickets", tags=["Tickets"])
app.include_router(bookings.router, prefix=f"{settings.API_V1_STR}/bookings", tags=["Bookings"])
app.include_router(payments.router, prefix=f"{settings.API_V1_STR}/payments", tags=["Payments"])

@app.get("/")
async def root():
    return {
        "message": "🎫 Booking Ticket API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    redis_status = "connected" if redis_client.get_client() else "disconnected"
    mongo_status = "connected" if mongodb_client.get_db() else "disconnected"
    
    return {
        "status": "healthy",
        "redis": redis_status,
        "mongodb": mongo_status
    }
