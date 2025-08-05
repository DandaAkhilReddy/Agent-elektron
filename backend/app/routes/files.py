from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional, List
import os
from datetime import datetime
import json
import uuid

from app.models import FileUploadResponse
from app.routes.auth import get_current_user
from app.services.blob_storage import BlobStorageService

router = APIRouter()

# Initialize blob storage service
blob_service = BlobStorageService()

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    metadata: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Upload file to Azure Blob Storage"""
    
    try:
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        
        # Create filename with timestamp and user info
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_email = current_user["email"].replace("@", "_").replace(".", "_")
        filename = f"{safe_email}_{timestamp}_{file_id}_{file.filename}"
        
        # Read file content
        content = await file.read()
        
        # Upload to blob storage
        file_url = await blob_service.upload_file(filename, content, file.content_type)
        
        # Store metadata if provided
        if metadata:
            try:
                metadata_dict = json.loads(metadata)
                metadata_filename = f"{filename}_metadata.json"
                await blob_service.upload_file(
                    metadata_filename, 
                    json.dumps(metadata_dict).encode(), 
                    "application/json"
                )
            except json.JSONDecodeError:
                pass  # Skip invalid metadata
        
        return FileUploadResponse(
            file_url=file_url,
            file_id=file_id,
            upload_timestamp=datetime.now()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Download file from Azure Blob Storage"""
    
    try:
        # In a real implementation, you'd lookup the file by ID
        # For now, return download URL
        download_url = await blob_service.get_download_url(file_id)
        return {"download_url": download_url}
        
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")

@router.get("/list")
async def list_files(
    current_user: dict = Depends(get_current_user)
):
    """List user's files"""
    
    try:
        # Filter files by user email
        safe_email = current_user["email"].replace("@", "_").replace(".", "_")
        files = await blob_service.list_user_files(safe_email)
        
        return {"files": files, "total": len(files)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete file from storage"""
    
    try:
        success = await blob_service.delete_file(file_id)
        if success:
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@router.post("/soap-export")
async def export_soap_note(
    soap_data: dict,
    format: str = "json",  # json, pdf, txt
    current_user: dict = Depends(get_current_user)
):
    """Export SOAP note in various formats"""
    
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_email = current_user["email"].replace("@", "_").replace(".", "_")
        
        if format.lower() == "json":
            filename = f"soap_{safe_email}_{timestamp}.json"
            content = json.dumps(soap_data, indent=2).encode()
            content_type = "application/json"
            
        elif format.lower() == "txt":
            filename = f"soap_{safe_email}_{timestamp}.txt"
            content = format_soap_as_text(soap_data).encode()
            content_type = "text/plain"
            
        elif format.lower() == "pdf":
            # PDF generation would be implemented here
            filename = f"soap_{safe_email}_{timestamp}.pdf"
            content = b"PDF generation not implemented yet"
            content_type = "application/pdf"
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
        
        # Upload to blob storage
        file_url = await blob_service.upload_file(filename, content, content_type)
        
        return {
            "file_url": file_url,
            "filename": filename,
            "format": format,
            "size": len(content)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

def format_soap_as_text(soap_data: dict) -> str:
    """Format SOAP note as plain text"""
    
    text = f"SOAP NOTE - Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    text += "=" * 60 + "\n\n"
    
    if "subjective" in soap_data:
        text += "SUBJECTIVE:\n"
        text += "-" * 20 + "\n"
        text += soap_data["subjective"] + "\n\n"
    
    if "objective" in soap_data:
        text += "OBJECTIVE:\n"
        text += "-" * 20 + "\n"
        text += soap_data["objective"] + "\n\n"
    
    if "assessment" in soap_data:
        text += "ASSESSMENT:\n"
        text += "-" * 20 + "\n"
        text += soap_data["assessment"] + "\n\n"
    
    if "plan" in soap_data:
        text += "PLAN:\n"
        text += "-" * 20 + "\n"
        text += soap_data["plan"] + "\n\n"
    
    return text