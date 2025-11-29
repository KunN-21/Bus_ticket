import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from app.core import redis_client
from app.config import settings
from app.utils import format_datetime_hcm

OTP_EXPIRY = 300  # 5 minutes

# Email settings
SMTP_SERVER = settings.SMTP_SERVER
SMTP_PORT = settings.SMTP_PORT
SMTP_EMAIL = settings.SMTP_EMAIL
SMTP_PASSWORD = settings.SMTP_PASSWORD

def generate_otp(length: int = 6) -> str:
    """Generate random OTP code"""
    return ''.join(random.choices(string.digits, k=length))

async def send_otp_email(email: str, otp: str) -> bool:
    """
    Send OTP via Email
    """
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = SMTP_EMAIL
        msg['To'] = email
        msg['Subject'] = "Mã xác thực OTP - Hệ thống đặt vé"
        
        # HTML body
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #333;">Xác thực tài khoản</h2>
                    <p style="font-size: 16px; color: #555;">Cảm ơn bạn đã đăng ký tài khoản!</p>
                    <p style="font-size: 16px; color: #555;">Mã OTP của bạn là:</p>
                    <div style="background-color: #007bff; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 5px; letter-spacing: 5px;">
                        {otp}
                    </div>
                    <p style="font-size: 14px; color: #888; margin-top: 20px;">Mã này có hiệu lực trong 5 phút.</p>
                    <p style="font-size: 14px; color: #888;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                </div>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(html, 'html'))
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ OTP sent to {email}: {otp}")
        return True
    except Exception as e:
        print(f"❌ Failed to send OTP to {email}: {str(e)}")
        return False


async def store_otp(identifier: str, otp: str):
    """Store OTP in Redis with expiry"""
    redis = redis_client.get_client()
    key = f"otp:{identifier}"
    await redis.setex(key, OTP_EXPIRY, otp)

async def verify_otp(identifier: str, otp: str) -> bool:
    """Verify OTP from Redis"""
    redis = redis_client.get_client()
    key = f"otp:{identifier}"
    stored_otp = await redis.get(key)
    
    if not stored_otp:
        return False
    
    if stored_otp == otp:
        # Delete OTP after successful verification
        await redis.delete(key)
        return True
    
    return False

async def delete_otp(identifier: str):
    """Delete OTP from Redis"""
    redis = redis_client.get_client()
    key = f"otp:{identifier}"
    await redis.delete(key)

async def store_registration_step(email: str, step: str, data: dict = None):
    """Store registration progress in Redis"""
    redis = redis_client.get_client()
    key = f"registration:{email}"
    value = {"step": step, "data": data or {}, "timestamp": format_datetime_hcm()}
    await redis.setex(key, 3600, str(value))  # 1 hour expiry

async def get_registration_step(email: str) -> dict:
    """Get registration progress from Redis"""
    redis = redis_client.get_client()
    key = f"registration:{email}"
    data = await redis.get(key)
    if data:
        return eval(data)
    return None

async def delete_registration_step(email: str):
    """Delete registration progress from Redis"""
    redis = redis_client.get_client()
    key = f"registration:{email}"
    await redis.delete(key)
