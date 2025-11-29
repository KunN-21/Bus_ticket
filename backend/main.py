from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core import redis_client
from app.config import settings
from app.routes import auth_router, users_router, routes_router
from app.routes.bookings_redis import router as bookings_router
from app.routes.statistics_redis import router as statistics_router
from app.routes.admin_redis import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.connect()
    yield
    await redis_client.disconnect()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8080",
        "http://localhost:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(routes_router)
app.include_router(bookings_router)
app.include_router(statistics_router)
app.include_router(admin_router)

@app.get("/")
async def root():
    return {"message": "Booking Ticket API", "version": "1.0.0", "docs": "/docs"}

@app.get("/health")
async def health_check():
    redis_status = "connected" if redis_client.get_client() is not None else "disconnected"
    return {"status": "healthy", "redis": redis_status}
