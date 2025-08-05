from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

from app.routes import auth, whisper, soapgen, files

load_dotenv()

app = FastAPI(
    title="AGENT-ELEKTRON Medical SOAP AI",
    description="AI-powered SOAP note generation for HHAMedicine doctors",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(whisper.router, prefix="/transcribe", tags=["transcription"])
app.include_router(soapgen.router, prefix="/soap", tags=["soap-generation"])
app.include_router(files.router, prefix="/files", tags=["file-management"])

@app.get("/")
async def root():
    return {"message": "AGENT-ELEKTRON Medical SOAP AI System", "status": "online"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AGENT-ELEKTRON"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)