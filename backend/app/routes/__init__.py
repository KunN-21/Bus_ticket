"""
API route handlers
"""

from .auth import router as auth_router
from .users import router as users_router
from .routes import router as routes_router

__all__ = [
    'auth_router',
    'users_router',
    'routes_router'
]
