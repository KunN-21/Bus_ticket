from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core import redis_client, mongodb_client
from app.config import settings
from app.routes import auth_router, users_router
from app.routes.admin_employees import router as admin_employees_router
from app.routes.admin_customers import router as admin_customers_router
from app.routes.roles import router as roles_router
# from app.routes import tickets_router, bookings_router, payments_router

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

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_employees_router)
app.include_router(admin_customers_router)
app.include_router(roles_router)

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
