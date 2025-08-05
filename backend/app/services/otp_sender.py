import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from typing import Optional

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@hhamedicine.com")

async def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP via SendGrid email service"""
    
    if not SENDGRID_API_KEY:
        print(f"Development mode: OTP for {to_email} is {otp}")
        return True
    
    try:
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to_email,
            subject="AGENT-ELEKTRON - Your Login OTP",
            html_content=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0D9488, #06B6D4); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">AGENT-ELEKTRON</h1>
                    <p style="color: white; margin: 5px 0;">Medical SOAP AI System</p>
                </div>
                
                <div style="padding: 30px; background: white;">
                    <h2 style="color: #0F172A;">Your Login Code</h2>
                    <p style="color: #64748B; font-size: 16px;">
                        Use this one-time password to access your AGENT-ELEKTRON account:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background: #F1F5F9; border: 2px dashed #0D9488; padding: 20px; border-radius: 8px; display: inline-block;">
                            <span style="font-size: 32px; font-weight: bold; color: #0D9488; letter-spacing: 4px;">{otp}</span>
                        </div>
                    </div>
                    
                    <p style="color: #64748B; font-size: 14px;">
                        This code will expire in 5 minutes for security purposes.
                    </p>
                    
                    <p style="color: #64748B; font-size: 14px;">
                        If you didn't request this code, please ignore this email.
                    </p>
                </div>
                
                <div style="background: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
                    <p style="color: #64748B; font-size: 12px; margin: 0;">
                        © 2024 AGENT-ELEKTRON Medical AI System | HHAMedicine.com
                    </p>
                </div>
            </div>
            """
        )
        
        sg = SendGridAPIClient(api_key=SENDGRID_API_KEY)
        response = sg.send(message)
        
        return response.status_code == 202
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        # In development, still print the OTP
        print(f"Development fallback: OTP for {to_email} is {otp}")
        return True