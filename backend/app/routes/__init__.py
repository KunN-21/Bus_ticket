"""
API route handlers - Redis version
"""

from .auth_redis import router as auth_router
from .users import router as users_router
from .routes_redis import router as routes_router
from .bookings_redis import router as bookings_router

__all__ = [
    'auth_router',
    'users_router',
    'routes_router',
    'bookings_router'
]
