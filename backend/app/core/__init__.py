"""
Core utilities and configurations
"""

from .jwt_settings import hash_password, verify_password, create_access_token, decode_access_token
from .database import redis_client

__all__ = [
    'hash_password',
    'verify_password', 
    'create_access_token',
    'decode_access_token',
    'redis_client',
]

# Import middleware functions directly where needed to avoid circular imports:
# from app.core.middleware import get_current_user, get_current_customer, get_current_employee
