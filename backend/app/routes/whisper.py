from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import whisper
import tempfile
import os
import time
from typing import Optional

from app.models import TranscriptionResponse
from app.routes.auth import get_current_user

router = APIRouter()

# Load Whisper model (using base model for balance of speed/accuracy)
try:
    whisper_model = whisper.load_model("base")
except Exception as e:
    print(f"Error loading Whisper model: {e}")
    whisper_model = None

@router.post("/audio", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Transcribe uploaded audio file using Whisper"""
    
    if whisper_model is None:
        raise HTTPException(status_code=503, detail="Whisper service unavailable")
    
    # Validate file type
    allowed_types = ["audio/wav", "audio/mp3", "audio/m4a", "audio/ogg", "audio/webm"]
    if audio_file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported audio format. Supported: {', '.join(allowed_types)}"
        )
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
        try:
            # Save uploaded file
            content = await audio_file.read()
            temp_file.write(content)
            temp_file.flush()
            
            start_time = time.time()
            
            # Transcribe with Whisper
            result = whisper_model.transcribe(
                temp_file.name,
                language="en",  # Force English for medical terminology
                task="transcribe"
            )
            
            processing_time = time.time() - start_time
            
            # Extract results
            transcript = result.get("text", "").strip()
            
            if not transcript:
                raise HTTPException(status_code=400, detail="No speech detected in audio")
            
            # Calculate confidence (Whisper doesn't provide direct confidence, so we estimate)
            avg_logprob = None
            if "segments" in result and result["segments"]:
                avg_logprob = sum(seg.get("avg_logprob", 0) for seg in result["segments"]) / len(result["segments"])
            
            confidence = None
            if avg_logprob is not None:
                # Convert log probability to confidence score (0-1)
                confidence = max(0, min(1, (avg_logprob + 1) / 1))
            
            return TranscriptionResponse(
                transcript=transcript,
                duration=result.get("duration", 0),
                confidence=confidence
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)

@router.get("/models")
async def list_available_models(current_user: dict = Depends(get_current_user)):
    """List available Whisper models"""
    return {
        "available_models": ["tiny", "base", "small", "medium", "large"],
        "current_model": "base",
        "languages_supported": ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh"],
        "recommended_for_medical": "base"  # Good balance of speed and accuracy
    }