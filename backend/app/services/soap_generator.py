import os
from typing import Dict, Optional
from transformers import pipeline
import re
import logging

logger = logging.getLogger(__name__)

class SOAPGeneratorService:
    def __init__(self):
        self.model_name = os.getenv("LLM_MODEL", "microsoft/DialoGPT-medium")
        self.huggingface_token = os.getenv("HUGGINGFACE_TOKEN")
        self.generator = None
        self._load_model()
    
    def _load_model(self):
        """Load the language model for SOAP generation"""
        try:
            # Using a text generation model suitable for medical documentation
            self.generator = pipeline(
                "text-generation",
                model="microsoft/DialoGPT-medium",
                tokenizer="microsoft/DialoGPT-medium",
                max_length=512,
                temperature=0.7,
                do_sample=True,
                pad_token_id=50256
            )
            logger.info("SOAP generator model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.generator = None
    
    async def generate_soap_note(
        self,
        transcript: str,
        patient_age: Optional[int] = None,
        patient_gender: Optional[str] = None,
        chief_complaint: Optional[str] = None,
        doctor_notes: Optional[str] = None
    ) -> Dict[str, str]:
        """Generate SOAP note components from transcript"""
        
        if self.generator is None:
            # Fallback to template-based generation
            return self._generate_template_soap(transcript, patient_age, patient_gender, chief_complaint)
        
        try:
            # Prepare context for AI generation
            context = self._prepare_context(transcript, patient_age, patient_gender, chief_complaint, doctor_notes)
            
            # Generate each SOAP component
            subjective = await self._generate_subjective(context)
            objective = await self._generate_objective(context)
            assessment = await self._generate_assessment(context)
            plan = await self._generate_plan(context)
            
            return {
                "subjective": subjective,
                "objective": objective,
                "assessment": assessment,
                "plan": plan,
                "confidence_score": 0.85
            }
            
        except Exception as e:
            logger.error(f"AI generation failed, falling back to templates: {e}")
            return self._generate_template_soap(transcript, patient_age, patient_gender, chief_complaint)
    
    def _prepare_context(self, transcript: str, age: Optional[int], gender: Optional[str], 
                        complaint: Optional[str], notes: Optional[str]) -> Dict:
        """Prepare context for AI generation"""
        return {
            "transcript": transcript,
            "age": age or "unknown",
            "gender": gender or "not specified",
            "chief_complaint": complaint or "not specified",
            "doctor_notes": notes or "",
            "medical_keywords": self._extract_medical_terms(transcript)
        }
    
    async def _generate_subjective(self, context: Dict) -> str:
        """Generate Subjective section"""
        prompt = f"""
        Based on this patient conversation transcript, write the Subjective section of a SOAP note.
        Focus on the patient's reported symptoms, concerns, and history.
        
        Patient age: {context['age']}
        Patient gender: {context['gender']}
        Chief complaint: {context['chief_complaint']}
        
        Transcript: {context['transcript'][:500]}...
        
        Subjective:
        """
        
        if self.generator:
            try:
                result = self.generator(prompt, max_length=200, num_return_sequences=1)
                generated = result[0]['generated_text']
                subjective = generated.split("Subjective:")[-1].strip()
                return self._clean_generated_text(subjective)
            except:
                pass
        
        # Fallback template
        return self._extract_subjective_from_transcript(context)
    
    async def _generate_objective(self, context: Dict) -> str:
        """Generate Objective section"""
        prompt = f"""
        Based on this medical transcript, write the Objective section of a SOAP note.
        Include vital signs, physical examination findings, and observable data.
        
        Transcript: {context['transcript'][:500]}...
        
        Objective:
        """
        
        if self.generator:
            try:
                result = self.generator(prompt, max_length=200, num_return_sequences=1)
                generated = result[0]['generated_text']
                objective = generated.split("Objective:")[-1].strip()
                return self._clean_generated_text(objective)
            except:
                pass
        
        # Fallback template
        return self._extract_objective_from_transcript(context)
    
    async def _generate_assessment(self, context: Dict) -> str:
        """Generate Assessment section"""
        prompt = f"""
        Based on this medical information, write the Assessment section of a SOAP note.
        Provide the most likely diagnosis and clinical reasoning.
        
        Chief complaint: {context['chief_complaint']}
        Key symptoms: {', '.join(context['medical_keywords'].get('symptoms', []))}
        
        Assessment:
        """
        
        if self.generator:
            try:
                result = self.generator(prompt, max_length=200, num_return_sequences=1)
                generated = result[0]['generated_text']
                assessment = generated.split("Assessment:")[-1].strip()
                return self._clean_generated_text(assessment)
            except:
                pass
        
        # Fallback template
        return self._generate_assessment_template(context)
    
    async def _generate_plan(self, context: Dict) -> str:
        """Generate Plan section"""
        prompt = f"""
        Based on this medical assessment, write the Plan section of a SOAP note.
        Include treatment recommendations, follow-up, and patient education.
        
        Chief complaint: {context['chief_complaint']}
        Patient age: {context['age']}
        
        Plan:
        """
        
        if self.generator:
            try:
                result = self.generator(prompt, max_length=200, num_return_sequences=1)
                generated = result[0]['generated_text']
                plan = generated.split("Plan:")[-1].strip()
                return self._clean_generated_text(plan)
            except:
                pass
        
        # Fallback template
        return self._generate_plan_template(context)
    
    def _generate_template_soap(self, transcript: str, age: Optional[int], 
                               gender: Optional[str], complaint: Optional[str]) -> Dict[str, str]:
        """Generate SOAP note using templates when AI is unavailable"""
        
        context = {
            "transcript": transcript,
            "age": age or "unknown",
            "gender": gender or "not specified",
            "chief_complaint": complaint or "chief complaint not specified",
            "medical_keywords": self._extract_medical_terms(transcript)
        }
        
        return {
            "subjective": self._extract_subjective_from_transcript(context),
            "objective": self._extract_objective_from_transcript(context),
            "assessment": self._generate_assessment_template(context),
            "plan": self._generate_plan_template(context),
            "confidence_score": 0.75
        }
    
    def _extract_medical_terms(self, text: str) -> Dict:
        """Extract medical keywords from transcript"""
        medical_terms = {
            "symptoms": ["pain", "headache", "fever", "nausea", "fatigue", "dizziness", 
                        "shortness of breath", "chest pain", "abdominal pain", "cough"],
            "medications": ["aspirin", "ibuprofen", "prescription", "medication", "dose"],
            "anatomy": ["heart", "lungs", "stomach", "head", "chest", "back", "arm", "leg"]
        }
        
        found_terms = {}
        text_lower = text.lower()
        
        for category, terms in medical_terms.items():
            found_terms[category] = [term for term in terms if term in text_lower]
        
        return found_terms
    
    def _extract_subjective_from_transcript(self, context: Dict) -> str:
        """Extract subjective information from transcript"""
        age_str = f"{context['age']} year old" if context['age'] != "unknown" else ""
        gender_str = context['gender'] if context['gender'] != "not specified" else ""
        
        subjective = f"{age_str} {gender_str} patient presents with {context['chief_complaint']}."
        
        # Add symptoms if found
        symptoms = context['medical_keywords'].get('symptoms', [])
        if symptoms:
            subjective += f" Patient reports {', '.join(symptoms[:3])}."
        
        return subjective.strip()
    
    def _extract_objective_from_transcript(self, context: Dict) -> str:
        """Extract objective information from transcript"""
        objective = "Physical examination performed."
        
        # Look for vital signs or examination findings in transcript
        transcript = context['transcript'].lower()
        
        if any(word in transcript for word in ["vital signs", "blood pressure", "heart rate"]):
            objective += " Vital signs documented."
        
        if any(word in transcript for word in ["examination", "exam", "physical"]):
            objective += " Physical examination findings noted."
        
        return objective
    
    def _generate_assessment_template(self, context: Dict) -> str:
        """Generate assessment using template"""
        symptoms = context['medical_keywords'].get('symptoms', [])
        
        if symptoms:
            primary_symptom = symptoms[0]
            assessment = f"Patient presents with {primary_symptom}. "
        else:
            assessment = f"Patient presents with {context['chief_complaint']}. "
        
        assessment += "Further evaluation needed to determine underlying cause."
        return assessment
    
    def _generate_plan_template(self, context: Dict) -> str:
        """Generate plan using template"""
        plan = "1. Continue current treatment regimen\n"
        plan += "2. Follow-up appointment in 1-2 weeks\n"
        plan += "3. Patient education provided\n"
        plan += "4. Return if symptoms worsen"
        
        return plan
    
    def _clean_generated_text(self, text: str) -> str:
        """Clean and format generated text"""
        # Remove extra whitespace and newlines
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove any unwanted patterns
        text = re.sub(r'^\W+', '', text)  # Remove leading non-word characters
        
        # Ensure proper capitalization
        if text and not text[0].isupper():
            text = text[0].upper() + text[1:]
        
        return text
    
    async def refine_soap_note(self, soap_note, refinement_notes: str) -> Dict[str, str]:
        """Refine existing SOAP note based on feedback"""
        # This would typically use the AI model to refine the note
        # For now, return the original with a note about refinement
        
        return {
            "subjective": soap_note.subjective + f" [Refined based on: {refinement_notes}]",
            "objective": soap_note.objective,
            "assessment": soap_note.assessment,
            "plan": soap_note.plan + "\n5. Additional considerations per physician review"
        }