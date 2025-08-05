from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer
import random
import string
import redis
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os
from typing import Optional

from app.models import LoginRequest, OTPVerifyRequest, TokenResponse, UserRole
from app.services.otp_sender import send_otp_email

router = APIRouter()
security = HTTPBearer()

ALLOWED_DOMAIN = os.getenv("ALLOWED_DOMAIN", "hhamedicine.com")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

# Redis for OTP storage (in production, use proper Redis)
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
except:
    # Fallback to in-memory dict for development
    redis_client = {}

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

def store_otp(email: str, otp: str):
    if hasattr(redis_client, 'setex'):
        redis_client.setex(f"otp:{email}", 300, otp)  # 5 minutes expiry
    else:
        redis_client[f"otp:{email}"] = {"otp": otp, "expires": datetime.now() + timedelta(minutes=5)}

def verify_otp(email: str, otp: str) -> bool:
    if hasattr(redis_client, 'get'):
        stored_otp = redis_client.get(f"otp:{email}")
        if stored_otp and stored_otp == otp:
            redis_client.delete(f"otp:{email}")
            return True
    else:
        stored_data = redis_client.get(f"otp:{email}")
        if stored_data and stored_data["otp"] == otp and datetime.now() < stored_data["expires"]:
            del redis_client[f"otp:{email}"]
            return True
    return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/login")
async def login(request: LoginRequest):
    email = request.email.lower()
    
    # Validate email domain
    if not email.endswith(f"@{ALLOWED_DOMAIN}"):
        raise HTTPException(
            status_code=403, 
            detail=f"Access restricted to {ALLOWED_DOMAIN} email addresses only"
        )
    
    # Generate and store OTP
    otp = generate_otp()
    store_otp(email, otp)
    
    # Send OTP via email
    try:
        await send_otp_email(email, otp)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")
    
    return {"message": "OTP sent to your email", "email": email}

@router.post("/verify", response_model=TokenResponse)
async def verify_otp_and_login(request: OTPVerifyRequest):
    email = request.email.lower()
    
    if not verify_otp(email, request.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    
    # Determine user role (simple logic - can be enhanced)
    role = UserRole.ADMIN if email.startswith("admin@") else UserRole.DOCTOR
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": email, "role": role.value}, 
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_email=email,
        role=role
    )

async def get_current_user(token: str = Depends(security)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None:
            raise credentials_exception
        return {"email": email, "role": role}
    except JWTError:
        raise credentials_exception

@router.get("/me")
async def get_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "email": current_user["email"],
        "role": current_user["role"],
        "authenticated": True
    }