"""
Email service using aiosmtplib with Gmail SMTP.
Set SMTP_USER and SMTP_PASS in .env to enable real emails.
OTPs are stored in memory (for demo). In production, use Redis/DB.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory OTP store: {email: {otp, expires_at}}
_otp_store: dict[str, dict] = {}


def _generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def store_otp(email: str) -> str:
    otp = _generate_otp()
    _otp_store[email.lower()] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    logger.info(f"[OTP] Generated OTP {otp} for {email} (expires in 10min)")
    return otp


def verify_otp(email: str, otp: str) -> bool:
    record = _otp_store.get(email.lower())
    if not record:
        return False
    if datetime.now(timezone.utc) > record["expires_at"]:
        del _otp_store[email.lower()]
        return False
    if record["otp"] != otp:
        return False
    del _otp_store[email.lower()]
    return True


async def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send email via SMTP. Falls back to console log if not configured."""
    import sys
    import re
    
    smtp_user = getattr(settings, 'SMTP_USER', None)
    smtp_pass = getattr(settings, 'SMTP_PASS', None)
    smtp_host = getattr(settings, 'SMTP_HOST', 'smtp.gmail.com')
    smtp_port = getattr(settings, 'SMTP_PORT', 587)

    if not smtp_user or not smtp_pass:
        # Extract OTP if present in the body
        otp_match = re.search(r'>([0-9]{6})</p>', html_body)
        otp_str = f" [OTP Code: {otp_match.group(1)}]" if otp_match else ""
        
        # Fallback to sys.stderr so it's guaranteed to show up in Uvicorn console/logs
        print("\n" + "=" * 60, file=sys.stderr)
        print(f"📧 [EMAIL DEMO]{otp_str}", file=sys.stderr)
        print(f"   TO:      {to_email}", file=sys.stderr)
        print(f"   SUBJECT: {subject}", file=sys.stderr)
        # Clean HTML tags to show text in console
        plain_text = re.sub(r'<[^>]+>', ' ', html_body)
        plain_text = " ".join(plain_text.split())[:300]
        print(f"   BODY:    {plain_text}...", file=sys.stderr)
        print("=" * 60 + "\n", file=sys.stderr)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        # SSL on 465, STARTTLS on 587
        use_tls = (smtp_port == 465)
        start_tls = (smtp_port == 587)

        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            use_tls=use_tls,
            start_tls=start_tls,
            username=smtp_user,
            password=smtp_pass,
        )
        logger.info(f"[EMAIL] Sent '{subject}' to {to_email}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL] Failed to send to {to_email}: {e}")
        return False


async def send_otp_email(to_email: str, otp: str, user_name: str = "") -> bool:
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
      <div style="background: linear-gradient(135deg, #0284c7, #0ea5e9); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">VendorBridge</h1>
        <p style="color: #bae6fd; margin: 4px 0 0; font-size: 13px;">Procurement Platform</p>
      </div>
      <div style="background: white; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0;">
        <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 8px;">Password Reset OTP</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">{"Hi " + user_name + ", use" if user_name else "Use"} the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="text-align: center; background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #0284c7; font-size: 40px; font-weight: 900; letter-spacing: 12px; margin: 0; font-family: monospace;">{otp}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 20px 0 0;">If you didn't request this, ignore this email. Your account is safe.</p>
      </div>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">© 2025 VendorBridge. All rights reserved.</p>
    </div>
    """
    return await send_email(to_email, "Your VendorBridge OTP Code", html)


async def send_approval_notification(
    to_emails: list[str], 
    subject: str, 
    vendor_name: str, 
    rfq_title: str,
    status: str
) -> bool:
    color = "#16a34a" if status == "Approved" else "#dc2626"
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
      <div style="background: linear-gradient(135deg, #0284c7, #0ea5e9); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">VendorBridge</h1>
      </div>
      <div style="background: white; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0;">
        <div style="display: inline-block; background: {'#f0fdf4' if status == 'Approved' else '#fff1f2'}; border: 1px solid {'#bbf7d0' if status == 'Approved' else '#fecdd3'}; border-radius: 8px; padding: 6px 14px; margin-bottom: 16px;">
          <span style="color: {color}; font-weight: 700; font-size: 13px;">✓ Quotation {status}</span>
        </div>
        <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 12px;">{subject}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Vendor</td><td style="padding: 8px 0; font-weight: 600; color: #1e293b; font-size: 13px; text-align: right; border-bottom: 1px solid #f1f5f9;">{vendor_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">RFQ</td><td style="padding: 8px 0; font-weight: 600; color: #1e293b; font-size: 13px; text-align: right;">{rfq_title}</td></tr>
        </table>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">Log in to VendorBridge to view the details and take action.</p>
      </div>
    </div>
    """
    success = True
    for email in to_emails:
        if email:
            result = await send_email(email, subject, html)
            success = success and result
    return success
