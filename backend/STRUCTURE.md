# Backend Structure

## 📁 Directory Organization

```
backend/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (not in git)
└── app/                    # Main application package
    ├── __init__.py
    ├── config.py           # Application settings (JWT, DB, SMTP, etc.)
    │
    ├── core/               # Core utilities and configurations
    │   ├── __init__.py
    │   ├── auth.py         # Authentication (JWT, password hashing)
    │   ├── database.py     # Database connections (MongoDB, Redis)
    │   └── middleware.py   # Authentication middleware
    │
    ├── models/             # Pydantic models for request/response
    │   ├── __init__.py
    │   └── auth.py         # Auth-related models
    │
    ├── routes/             # API route handlers
    │   ├── __init__.py
    │   ├── auth.py         # Authentication endpoints
    │   └── users.py        # User management endpoints
    │
    ├── services/           # Business logic and external services
    │   ├── __init__.py
    │   └── otp_service.py  # OTP generation and email sending
    │
    └── utils/              # Helper functions and utilities
        └── __init__.py
```

## 🔧 Key Components

### Core (`app/core/`)
- **auth.py**: JWT token creation/verification, bcrypt password hashing
- **database.py**: MongoDB and Redis async connection managers
- **middleware.py**: Authentication middleware for protected routes

### Models (`app/models/`)
- **auth.py**: Pydantic models for registration, login, OTP verification

### Routes (`app/routes/`)
- **auth.py**: Registration flow (4 steps), login, OTP resend
- **users.py**: User profile management

### Services (`app/services/`)
- **otp_service.py**: OTP generation, email sending via SMTP, Redis storage

## 🚀 How to Run

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables in `.env`:
```env
MONGO_URL=your_mongodb_uri
REDIS_HOST=your_redis_host
JWT_SECRET_KEY=your_secret_key
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

3. Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📝 Import Examples

```python
# In routes/auth.py
from app.core.database import mongodb_client
from app.models.auth import RegisterInitiate
from app.services.otp_service import send_otp_email
from app.core.auth import hash_password

# In services/otp_service.py
from app.core.database import redis_client
from app.config import settings
```

## 🔐 Authentication Flow

1. **Registration** (4 steps):
   - Step 1: Email → Generate & send OTP
   - Step 2: Verify OTP → Move to password creation
   - Step 3: Set password → Move to info completion
   - Step 4: Complete info → Create account & return JWT

2. **Login**:
   - Email + Password → Verify → Return JWT token

3. **Protected Routes**:
   - Use `Depends(get_current_customer)` middleware
   - Requires `Authorization: Bearer <token>` header
