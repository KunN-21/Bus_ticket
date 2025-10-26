import random
import string
from datetime import datetime, timedelta
from database import redis_client

OTP_EXPIRY = 300  # 5 minutes

def generate_otp(length: int = 6) -> str:
    """Generate random OTP code"""
    return ''.join(random.choices(string.digits, k=length))

async def send_otp_sms(phone: str, otp: str):
    """
    Send OTP via SMS (mock implementation)
    In production, integrate with SMS gateway like Twilio, AWS SNS, etc.
    """
    # TODO: Implement real SMS sending
    print(f"📱 Sending OTP to {phone}: {otp}")
    # Example with Twilio:
    # client = Client(account_sid, auth_token)
    # message = client.messages.create(
    #     body=f"Your OTP is: {otp}",
    #     from_='+1234567890',
    #     to=phone
    # )
    return True

async def store_otp(phone: str, otp: str):
    """Store OTP in Redis with expiry"""
    redis = redis_client.get_client()
    key = f"otp:{phone}"
    await redis.setex(key, OTP_EXPIRY, otp)

async def verify_otp(phone: str, otp: str) -> bool:
    """Verify OTP from Redis"""
    redis = redis_client.get_client()
    key = f"otp:{phone}"
    stored_otp = await redis.get(key)
    
    if not stored_otp:
        return False
    
    if stored_otp == otp:
        # Delete OTP after successful verification
        await redis.delete(key)
        return True
    
    return False

async def delete_otp(phone: str):
    """Delete OTP from Redis"""
    redis = redis_client.get_client()
    key = f"otp:{phone}"
    await redis.delete(key)
