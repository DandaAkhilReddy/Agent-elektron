from fastapi import APIRouter, HTTPException, Depends
import time
from datetime import datetime
from typing import Optional

from app.models import SOAPRequest, SOAPResponse, SOAPNote
from app.routes.auth import get_current_user
from app.services.soap_generator import SOAPGeneratorService

router = APIRouter()

# Initialize SOAP generator service
soap_generator = SOAPGeneratorService()

@router.post("/generate", response_model=SOAPResponse)
async def generate_soap_note(
    request: SOAPRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate SOAP note from transcript"""
    
    if not request.transcript or len(request.transcript.strip()) < 10:
        raise HTTPException(status_code=400, detail="Transcript too short for SOAP generation")
    
    start_time = time.time()
    
    try:
        # Generate SOAP note using AI service
        soap_components = await soap_generator.generate_soap_note(
            transcript=request.transcript,
            patient_age=request.patient_age,
            patient_gender=request.patient_gender,
            chief_complaint=request.chief_complaint,
            doctor_notes=request.doctor_notes
        )
        
        # Create SOAP note object
        soap_note = SOAPNote(
            subjective=soap_components["subjective"],
            objective=soap_components["objective"],
            assessment=soap_components["assessment"],
            plan=soap_components["plan"],
            generated_at=datetime.now(),
            doctor_email=current_user["email"],
            patient_id=request.chief_complaint[:20] if request.chief_complaint else None
        )
        
        processing_time = time.time() - start_time
        
        return SOAPResponse(
            soap_note=soap_note,
            confidence_score=soap_components.get("confidence_score"),
            processing_time=processing_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SOAP generation failed: {str(e)}")

@router.post("/refine")
async def refine_soap_note(
    soap_note: SOAPNote,
    refinement_notes: str,
    current_user: dict = Depends(get_current_user)
):
    """Refine an existing SOAP note based on doctor feedback"""
    
    try:
        refined_components = await soap_generator.refine_soap_note(
            soap_note=soap_note,
            refinement_notes=refinement_notes
        )
        
        # Update SOAP note
        refined_soap = SOAPNote(
            subjective=refined_components["subjective"],
            objective=refined_components["objective"],
            assessment=refined_components["assessment"],
            plan=refined_components["plan"],
            generated_at=datetime.now(),
            doctor_email=current_user["email"],
            patient_id=soap_note.patient_id
        )
        
        return {"refined_soap_note": refined_soap, "message": "SOAP note refined successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SOAP refinement failed: {str(e)}")

@router.get("/templates")
async def get_soap_templates(current_user: dict = Depends(get_current_user)):
    """Get SOAP note templates for different medical specialties"""
    
    templates = {
        "general_medicine": {
            "subjective": "Patient presents with [chief complaint]. Symptoms include [symptoms]. Duration: [duration]. Associated factors: [factors].",
            "objective": "Vital signs: [vitals]. Physical examination: [exam findings]. Relevant diagnostic results: [results].",
            "assessment": "Primary diagnosis: [diagnosis]. Differential considerations: [differentials]. Clinical reasoning: [reasoning].",
            "plan": "Treatment plan: [treatment]. Follow-up: [follow_up]. Patient education: [education]. Monitoring: [monitoring]."
        },
        "pediatrics": {
            "subjective": "Patient (age [age]) presents with [chief complaint]. Parent/guardian reports [symptoms]. Developmental milestones: [milestones].",
            "objective": "Growth parameters: [growth]. Vital signs: [vitals]. Physical examination: [exam]. Immunization status: [vaccines].",
            "assessment": "Primary diagnosis: [diagnosis]. Age-appropriate considerations: [considerations].",
            "plan": "Treatment: [treatment]. Parental education: [education]. Follow-up: [follow_up]. Safety counseling: [safety]."
        },
        "emergency": {
            "subjective": "Chief complaint: [complaint]. Onset: [onset]. Severity: [severity]. Associated symptoms: [symptoms].",
            "objective": "Triage vitals: [vitals]. Emergency assessment: [assessment]. Diagnostic studies: [studies].",
            "assessment": "Working diagnosis: [diagnosis]. Acuity level: [acuity]. Risk stratification: [risk].",
            "plan": "Immediate interventions: [interventions]. Disposition: [disposition]. Follow-up instructions: [instructions]."
        }
    }
    
    return {"templates": templates, "message": "SOAP templates retrieved successfully"}

@router.get("/statistics")
async def get_soap_statistics(current_user: dict = Depends(get_current_user)):
    """Get SOAP generation statistics for the current user"""
    
    # This would typically query a database
    # For now, return mock statistics
    stats = {
        "total_generated": 0,
        "this_month": 0,
        "this_week": 0,
        "average_processing_time": 0.0,
        "most_common_diagnoses": [],
        "specialties_used": []
    }
    
    return {"statistics": stats, "user_email": current_user["email"]}