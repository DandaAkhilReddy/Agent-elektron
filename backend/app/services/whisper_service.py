import whisper
import tempfile
import os
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class WhisperService:
    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the Whisper model"""
        try:
            self.model = whisper.load_model(self.model_name)
            logger.info(f"Loaded Whisper model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load Whisper model {self.model_name}: {e}")
            raise
    
    def transcribe_file(self, file_path: str, language: str = "en") -> Dict:
        """Transcribe audio file and return detailed results"""
        if self.model is None:
            raise RuntimeError("Whisper model not loaded")
        
        try:
            result = self.model.transcribe(
                file_path,
                language=language,
                task="transcribe",
                verbose=False
            )
            return result
        except Exception as e:
            logger.error(f"Transcription failed for {file_path}: {e}")
            raise
    
    def transcribe_with_timestamps(self, file_path: str, language: str = "en") -> Dict:
        """Transcribe with word-level timestamps for better analysis"""
        if self.model is None:
            raise RuntimeError("Whisper model not loaded")
        
        try:
            result = self.model.transcribe(
                file_path,
                language=language,
                task="transcribe",
                verbose=False,
                word_timestamps=True
            )
            return result
        except Exception as e:
            logger.error(f"Transcription with timestamps failed for {file_path}: {e}")
            raise
    
    def calculate_confidence(self, result: Dict) -> Optional[float]:
        """Calculate average confidence score from Whisper result"""
        if "segments" not in result or not result["segments"]:
            return None
        
        total_logprob = 0
        total_words = 0
        
        for segment in result["segments"]:
            if "avg_logprob" in segment:
                # Weight by number of words in segment
                words_in_segment = len(segment.get("text", "").split())
                total_logprob += segment["avg_logprob"] * words_in_segment
                total_words += words_in_segment
        
        if total_words == 0:
            return None
        
        avg_logprob = total_logprob / total_words
        # Convert log probability to confidence (0-1 scale)
        confidence = max(0, min(1, (avg_logprob + 1) / 1))
        return confidence
    
    def extract_medical_keywords(self, transcript: str) -> Dict:
        """Extract potential medical keywords and phrases"""
        medical_terms = {
            "symptoms": ["pain", "headache", "fever", "nausea", "fatigue", "dizziness", 
                        "shortness of breath", "chest pain", "abdominal pain", "back pain"],
            "medications": ["aspirin", "ibuprofen", "acetaminophen", "prescription", 
                           "medication", "pills", "dose", "mg", "tablet"],
            "procedures": ["x-ray", "blood test", "ultrasound", "MRI", "CT scan", 
                          "examination", "checkup", "surgery", "procedure"],
            "anatomy": ["heart", "lungs", "stomach", "head", "chest", "abdomen", 
                       "back", "arm", "leg", "neck", "shoulder"]
        }
        
        found_terms = {}
        transcript_lower = transcript.lower()
        
        for category, terms in medical_terms.items():
            found_terms[category] = [term for term in terms if term in transcript_lower]
        
        return found_terms
    
    def get_model_info(self) -> Dict:
        """Get information about the current model"""
        return {
            "model_name": self.model_name,
            "is_loaded": self.model is not None,
            "supported_languages": ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh"],
            "recommended_for_medical": self.model_name in ["base", "small", "medium"]
        }