#!/usr/bin/env python3
"""
AGENT-ELEKTRON Backend Startup Script
=====================================

This script starts the AGENT-ELEKTRON FastAPI backend server with proper configuration.
It includes:
- Environment validation
- Dependency checks
- Service health checks
- Graceful startup and shutdown

Usage:
    python start_backend.py [--dev] [--port 8000] [--host 0.0.0.0]

Options:
    --dev       Enable development mode with auto-reload
    --port      Specify port number (default: 8000)
    --host      Specify host address (default: 0.0.0.0)
    --help      Show this help message
"""

import os
import sys
import argparse
import asyncio
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

try:
    import uvicorn
    from dotenv import load_dotenv
    from app.main import app
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("📦 Installing required packages...")
    
    import subprocess
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", 
            str(backend_dir / "requirements.txt")
        ])
        print("✅ Dependencies installed successfully!")
        
        # Try importing again
        import uvicorn
        from dotenv import load_dotenv
        from app.main import app
    except Exception as install_error:
        print(f"❌ Failed to install dependencies: {install_error}")
        sys.exit(1)

def check_environment():
    """Validate environment configuration"""
    
    # Load environment variables
    env_file = backend_dir / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        print(f"✅ Loaded environment from {env_file}")
    else:
        print(f"⚠️  No .env file found. Copy .env.example to .env and configure.")
    
    # Check critical environment variables
    critical_vars = {
        "SECRET_KEY": "JWT secret key",
        "ALLOWED_DOMAIN": "Allowed email domain",
    }
    
    optional_vars = {
        "SENDGRID_API_KEY": "Email service (OTP will print to console)",
        "AZURE_STORAGE_CONNECTION_STRING": "File storage (will use local storage)",
        "HUGGINGFACE_TOKEN": "AI model access (may have rate limits)",
    }
    
    print("\n🔍 Environment Check:")
    print("-" * 50)
    
    missing_critical = []
    for var, description in critical_vars.items():
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {'*' * min(len(value), 20)}")
        else:
            print(f"❌ {var}: Missing ({description})")
            missing_critical.append(var)
    
    for var, description in optional_vars.items():
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {'*' * min(len(value), 20)}")
        else:
            print(f"⚠️  {var}: Not configured ({description})")
    
    if missing_critical:
        print(f"\n❌ Missing critical environment variables: {', '.join(missing_critical)}")
        print("📝 Please configure these in your .env file")
        return False
    
    return True

def check_model_availability():
    """Check if AI models are available"""
    
    print("\n🤖 AI Model Check:")
    print("-" * 50)
    
    # Check Whisper
    try:
        import whisper
        models = whisper.available_models()
        print(f"✅ Whisper: Available models: {', '.join(models)}")
    except Exception as e:
        print(f"⚠️  Whisper: {e}")
    
    # Check Transformers
    try:
        from transformers import pipeline
        print("✅ Transformers: Available")
    except Exception as e:
        print(f"⚠️  Transformers: {e}")
    
    # Check PyTorch
    try:
        import torch
        device = "GPU" if torch.cuda.is_available() else "CPU"
        print(f"✅ PyTorch: {torch.__version__} ({device})")
    except Exception as e:
        print(f"⚠️  PyTorch: {e}")

def print_startup_info(host: str, port: int, dev_mode: bool):
    """Print startup information"""
    
    print("\n" + "=" * 60)
    print("🏥 AGENT-ELEKTRON Medical SOAP AI System")
    print("=" * 60)
    print(f"🌐 Server: http://{host}:{port}")
    print(f"📚 API Docs: http://{host}:{port}/docs")
    print(f"🔧 Mode: {'Development' if dev_mode else 'Production'}")
    print(f"📁 Backend: {backend_dir}")
    print("=" * 60)
    
    if dev_mode:
        print("🚀 Development mode enabled - auto-reload on file changes")
    
    print("🔑 Authorized users: @hhamedicine.com only")
    print("📧 OTP login required for access")
    print("\n⚡ Server starting...")

def main():
    """Main entry point"""
    
    parser = argparse.ArgumentParser(
        description="Start AGENT-ELEKTRON Backend Server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "--dev", 
        action="store_true", 
        help="Enable development mode with auto-reload"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=8000, 
        help="Port number (default: 8000)"
    )
    parser.add_argument(
        "--host", 
        default="0.0.0.0", 
        help="Host address (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--skip-checks", 
        action="store_true", 
        help="Skip environment and model checks"
    )
    
    args = parser.parse_args()
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    if not args.skip_checks:
        # Validate environment
        if not check_environment():
            print("\n❌ Environment validation failed!")
            print("💡 Use --skip-checks to start anyway (not recommended)")
            sys.exit(1)
        
        # Check model availability
        check_model_availability()
    
    # Print startup information
    print_startup_info(args.host, args.port, args.dev)
    
    # Configure uvicorn
    config = {
        "app": "app.main:app",
        "host": args.host,
        "port": args.port,
        "reload": args.dev,
        "access_log": args.dev,
        "log_level": "debug" if args.dev else "info",
    }
    
    if args.dev:
        config["reload_dirs"] = [str(backend_dir / "app")]
    
    try:
        # Start the server
        uvicorn.run(**config)
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()