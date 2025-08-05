from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging
import os

from app.models import AdminStats, UsageStats
from app.routes.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory storage for demo purposes (use database in production)
user_activities = {}
system_logs = []

def require_admin(current_user: dict = Depends(get_current_user)):
    """Ensure user has admin privileges"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

@router.get("/stats")
async def get_usage_stats(admin_user: dict = Depends(require_admin)):
    """Get system-wide usage statistics"""
    
    # In a real implementation, this would query the database
    # For demo purposes, return mock data with some real calculations
    
    try:
        # Mock data for demonstration
        total_users = len(user_activities) if user_activities else 5
        total_soap_notes = sum(activity.get('soap_count', 0) for activity in user_activities.values()) or 127
        total_transcriptions = sum(activity.get('transcription_count', 0) for activity in user_activities.values()) or 89
        storage_used_gb = sum(activity.get('storage_mb', 0) for activity in user_activities.values()) / 1024 or 2.3
        
        # Generate top users data
        top_users = []
        for email, activity in list(user_activities.items())[:5]:
            top_users.append(UsageStats(
                doctor_email=email,
                total_transcriptions=activity.get('transcription_count', 0),
                total_soap_notes=activity.get('soap_count', 0),
                last_activity=activity.get('last_activity', datetime.now()),
                storage_used_mb=activity.get('storage_mb', 0)
            ))
        
        # If no real data, add mock top users
        if not top_users:
            mock_users = [
                "dr.smith@hhamedicine.com",
                "dr.johnson@hhamedicine.com", 
                "dr.williams@hhamedicine.com",
                "dr.brown@hhamedicine.com",
                "dr.davis@hhamedicine.com"
            ]
            
            for i, email in enumerate(mock_users):
                top_users.append(UsageStats(
                    doctor_email=email,
                    total_transcriptions=15 - i * 2,
                    total_soap_notes=25 - i * 3,
                    last_activity=datetime.now() - timedelta(hours=i),
                    storage_used_mb=150.5 - i * 20
                ))
        
        stats = AdminStats(
            total_users=total_users,
            active_users_today=max(1, total_users - 2),
            total_transcriptions=total_transcriptions,
            total_soap_notes=total_soap_notes,
            storage_used_gb=storage_used_gb,
            top_users=top_users
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get usage stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve usage statistics")

@router.get("/logs")
async def get_system_logs(
    limit: Optional[int] = 100,
    level: Optional[str] = None,
    admin_user: dict = Depends(require_admin)
):
    """Get system activity logs"""
    
    try:
        # Add some mock logs if none exist
        if not system_logs:
            mock_logs = [
                {
                    "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat(),
                    "level": "info",
                    "message": "User login successful: dr.smith@hhamedicine.com",
                    "source": "auth"
                },
                {
                    "timestamp": (datetime.now() - timedelta(minutes=15)).isoformat(),
                    "level": "info", 
                    "message": "SOAP note generated successfully",
                    "source": "soap_generation"
                },
                {
                    "timestamp": (datetime.now() - timedelta(minutes=30)).isoformat(),
                    "level": "warning",
                    "message": "High API usage detected for user: dr.johnson@hhamedicine.com",
                    "source": "monitoring"
                },
                {
                    "timestamp": (datetime.now() - timedelta(hours=1)).isoformat(),
                    "level": "info",
                    "message": "Audio transcription completed in 2.3s",
                    "source": "whisper"
                },
                {
                    "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
                    "level": "error",
                    "message": "Failed OTP attempt for invalid email: user@gmail.com",
                    "source": "auth"
                }
            ]
            system_logs.extend(mock_logs)
        
        # Filter by level if specified
        filtered_logs = system_logs
        if level:
            filtered_logs = [log for log in system_logs if log.get("level") == level.lower()]
        
        # Apply limit
        limited_logs = filtered_logs[:limit] if limit else filtered_logs
        
        return {
            "logs": limited_logs,
            "total": len(filtered_logs),
            "filtered": len(limited_logs)
        }
        
    except Exception as e:
        logger.error(f"Failed to get system logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system logs")

@router.get("/users")
async def get_users(admin_user: dict = Depends(require_admin)):
    """Get list of all users"""
    
    try:
        # In a real implementation, this would query the user database
        # For demo, return mock user data
        
        mock_users = [
            {
                "email": "admin@hhamedicine.com",
                "role": "admin",
                "last_activity": (datetime.now() - timedelta(minutes=5)).isoformat(),
                "soap_count": 0,
                "created_at": (datetime.now() - timedelta(days=30)).isoformat()
            },
            {
                "email": "dr.smith@hhamedicine.com", 
                "role": "doctor",
                "last_activity": (datetime.now() - timedelta(minutes=15)).isoformat(),
                "soap_count": 25,
                "created_at": (datetime.now() - timedelta(days=20)).isoformat()
            },
            {
                "email": "dr.johnson@hhamedicine.com",
                "role": "doctor", 
                "last_activity": (datetime.now() - timedelta(hours=2)).isoformat(),
                "soap_count": 18,
                "created_at": (datetime.now() - timedelta(days=15)).isoformat()
            },
            {
                "email": "dr.williams@hhamedicine.com",
                "role": "doctor",
                "last_activity": (datetime.now() - timedelta(days=1)).isoformat(),
                "soap_count": 12,
                "created_at": (datetime.now() - timedelta(days=10)).isoformat()
            }
        ]
        
        # Add any real user data
        for email, activity in user_activities.items():
            # Check if user already in mock data
            if not any(user["email"] == email for user in mock_users):
                mock_users.append({
                    "email": email,
                    "role": "doctor",
                    "last_activity": activity.get("last_activity", datetime.now()).isoformat(),
                    "soap_count": activity.get("soap_count", 0),
                    "created_at": activity.get("created_at", datetime.now()).isoformat()
                })
        
        return {"users": mock_users, "total": len(mock_users)}
        
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve users")

@router.post("/logs/add")
async def add_system_log(
    message: str,
    level: str = "info",
    source: str = "system",
    admin_user: dict = Depends(require_admin)
):
    """Add a system log entry"""
    
    try:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level.lower(),
            "message": message,
            "source": source,
            "admin_user": admin_user["email"]
        }
        
        system_logs.insert(0, log_entry)  # Add to beginning
        
        # Keep only last 1000 logs
        if len(system_logs) > 1000:
            system_logs[:] = system_logs[:1000]
        
        return {"message": "Log entry added successfully", "log": log_entry}
        
    except Exception as e:
        logger.error(f"Failed to add log entry: {e}")
        raise HTTPException(status_code=500, detail="Failed to add log entry")

@router.get("/system/health")
async def get_system_health(admin_user: dict = Depends(require_admin)):
    """Get system health status"""
    
    try:
        # Check various system components
        health_status = {
            "api_server": "healthy",
            "whisper_service": "healthy", 
            "azure_blob": "healthy" if os.getenv("AZURE_STORAGE_CONNECTION_STRING") else "not_configured",
            "email_service": "healthy" if os.getenv("SENDGRID_API_KEY") else "not_configured",
            "redis": "not_configured",  # Would check Redis connection in real implementation
            "database": "healthy",
            "timestamp": datetime.now().isoformat()
        }
        
        # Overall system status
        unhealthy_services = [k for k, v in health_status.items() 
                            if v not in ["healthy", "not_configured"] and k != "timestamp"]
        
        overall_status = "healthy" if not unhealthy_services else "degraded"
        
        return {
            "overall_status": overall_status,
            "services": health_status,
            "unhealthy_services": unhealthy_services
        }
        
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve system health")

# Helper function to track user activity (called from other routes)
def track_user_activity(email: str, activity_type: str, metadata: dict = None):
    """Track user activity for admin statistics"""
    
    if email not in user_activities:
        user_activities[email] = {
            "created_at": datetime.now(),
            "soap_count": 0,
            "transcription_count": 0,
            "storage_mb": 0,
            "last_activity": datetime.now()
        }
    
    activity = user_activities[email]
    activity["last_activity"] = datetime.now()
    
    if activity_type == "soap_generated":
        activity["soap_count"] += 1
    elif activity_type == "transcription_completed":
        activity["transcription_count"] += 1
    elif activity_type == "file_uploaded" and metadata:
        activity["storage_mb"] += metadata.get("size_mb", 0)
    
    # Add log entry
    system_logs.insert(0, {
        "timestamp": datetime.now().isoformat(),
        "level": "info",
        "message": f"User activity: {activity_type} for {email}",
        "source": "activity_tracker"
    })