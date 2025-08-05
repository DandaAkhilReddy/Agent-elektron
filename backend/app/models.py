from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    DOCTOR = "doctor"
    ADMIN = "admin"

class LoginRequest(BaseModel):
    email: EmailStr

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_email: str
    role: UserRole

class TranscriptionRequest(BaseModel):
    audio_file_url: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None

class TranscriptionResponse(BaseModel):
    transcript: str
    duration: float
    confidence: Optional[float] = None

class SOAPRequest(BaseModel):
    transcript: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    chief_complaint: Optional[str] = None
    doctor_notes: Optional[str] = None

class SOAPNote(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str
    generated_at: datetime
    doctor_email: str
    patient_id: Optional[str] = None

class SOAPResponse(BaseModel):
    soap_note: SOAPNote
    confidence_score: Optional[float] = None
    processing_time: float

class FileUploadResponse(BaseModel):
    file_url: str
    file_id: str
    upload_timestamp: datetime

class UsageStats(BaseModel):
    doctor_email: str
    total_transcriptions: int
    total_soap_notes: int
    last_activity: datetime
    storage_used_mb: float

class AdminStats(BaseModel):
    total_users: int
    active_users_today: int
    total_transcriptions: int
    total_soap_notes: int
    storage_used_gb: float
    top_users: List[UsageStats]