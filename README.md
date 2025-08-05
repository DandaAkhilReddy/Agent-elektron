# AGENT-ELEKTRON 🏥⚡

**Enterprise Medical SOAP AI Documentation System**

An AI-powered medical documentation platform designed specifically for HHAMedicine doctors to streamline SOAP note generation through voice recording and intelligent transcription.

## 🚀 Features

- 🔐 **Secure OTP Authentication** - Restricted access to `@hhamedicine.com` email addresses only
- 🎙️ **Voice Recording & Transcription** - Advanced Whisper integration for medical terminology
- 🤖 **AI-Powered SOAP Generation** - Intelligent medical documentation using LLM models
- 📋 **Structured Medical Notes** - Professional SOAP format (Subjective, Objective, Assessment, Plan)
- 📱 **Modern Web Interface** - Responsive React frontend with Tailwind CSS
- ☁️ **Azure Cloud Integration** - Scalable deployment with Blob storage
- 📧 **Professional Email System** - Branded OTP emails via SendGrid

## 🏗️ Architecture

```
AGENT-ELEKTRON/
├── backend/          # FastAPI Python backend
├── frontend/         # React + Tailwind frontend  
├── azure_deploy/     # Azure deployment configs
└── README.md         # This file
```

## 🔧 Tech Stack

**Backend:**
- FastAPI (Python web framework)
- OpenAI Whisper (Speech-to-text)
- Transformers (LLM integration)
- SendGrid (Email service)
- Azure Blob Storage
- Redis (OTP caching)

**Frontend:**
- React 18
- Tailwind CSS
- Vite (Build tool)
- Audio Recording APIs

**Deployment:**
- Azure App Services
- Azure Functions
- Azure Blob Storage
- Docker containers

## 🚦 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Azure account
- SendGrid account

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Configure your environment
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

**Backend (.env):**
```env
SENDGRID_API_KEY=your_sendgrid_key
AZURE_BLOB_KEY=your_azure_key
AZURE_BLOB_CONTAINER=soap-notes
HUGGINGFACE_TOKEN=your_hf_token
ALLOWED_DOMAIN=hhamedicine.com
SECRET_KEY=your_jwt_secret
```

**Frontend (.env):**
```env
VITE_API_BASE=http://localhost:8000
VITE_BLOB_STORAGE_URL=https://your-account.blob.core.windows.net/
```

## 🔐 Security Features

- **Domain Restriction**: Only `@hhamedicine.com` emails accepted
- **OTP Authentication**: 6-digit codes with 5-minute expiry
- **JWT Tokens**: Secure session management
- **HIPAA Considerations**: Encrypted storage and transmission

## 📊 API Endpoints

### Authentication
- `POST /auth/login` - Send OTP to email
- `POST /auth/verify` - Verify OTP and get token
- `GET /auth/me` - Get current user info

### Transcription
- `POST /transcribe/audio` - Upload and transcribe audio
- `GET /transcribe/models` - List available models

### SOAP Generation
- `POST /soap/generate` - Generate SOAP note from transcript
- `POST /soap/refine` - Refine existing SOAP note
- `GET /soap/templates` - Get SOAP templates

## 🎯 Usage Workflow

1. **Doctor Login** → Enter `@hhamedicine.com` email
2. **OTP Verification** → Check email for 6-digit code
3. **Voice Recording** → Record patient conversation
4. **AI Transcription** → Whisper converts speech to text
5. **SOAP Generation** → LLM creates structured medical note
6. **Review & Edit** → Doctor reviews and finalizes
7. **Save & Export** → Store in Azure Blob storage

## 🏥 Medical Specialties Supported

- General Medicine
- Pediatrics
- Emergency Medicine
- Internal Medicine
- Family Practice

## 📱 Screenshots

*Coming soon...*

## 🚀 Deployment

### Azure Deployment
```bash
# Deploy backend
az webapp up --name agent-elektron-api --resource-group hhamed-rg

# Deploy frontend
npm run build
az storage blob upload-batch --destination $web --source ./dist
```

## 🤝 Contributing

This is a private medical system for HHAMedicine. Contact the development team for access.

## 📄 License

Proprietary - HHAMedicine Internal Use Only

## 🆘 Support

For technical support:
- Internal IT: it@hhamedicine.com
- Developer: akhilreddydanda@github.com

---

**Built with ❤️ for HHAMedicine doctors**

*Streamlining medical documentation through AI innovation*