import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from typing import Optional, List
import os
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails with PDF attachments"""
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.email_address = os.getenv("EMAIL_ADDRESS")
        self.email_password = os.getenv("EMAIL_PASSWORD")
        self.executor = ThreadPoolExecutor(max_workers=2)  # Reduced from 4 to save memory
        
        # Logo path - try to find the logo in the project
        self.logo_path = self._find_logo_path()
        
        if not self.email_address or not self.email_password:
            logger.warning("Email credentials not configured. Email service will not work.")
    
    def _find_logo_path(self) -> Optional[str]:
        """Find the logo file in the project"""
        possible_paths = [
            "../next_frontend/public/Logo.png",
            "../js_chrome_extension/assets/Logo.png"
        ]
        
        for path in possible_paths:
            if Path(path).exists():
                return path
        
        logger.warning("Logo file not found")
        return None
    
    def _send_email_sync(
        self,
        to_email: str,
        subject: str,
        body: str,
        pdf_path: Optional[str] = None,
        pdf_filename: Optional[str] = None
    ) -> bool:
        """Synchronous email sending function"""
        try:
            # Create message
            msg = MIMEMultipart('related')
            msg['From'] = self.email_address
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Create alternative container for HTML and plain text
            msg_alternative = MIMEMultipart('alternative')
            msg.attach(msg_alternative)
            
            # Add body
            msg_alternative.attach(MIMEText(body, 'html'))
            
            # Add logo as embedded image if available
            if self.logo_path and Path(self.logo_path).exists():
                try:
                    with open(self.logo_path, 'rb') as f:
                        logo_data = f.read()
                    
                    logo_image = MIMEImage(logo_data)
                    logo_image.add_header('Content-ID', '<company_logo>')
                    logo_image.add_header('Content-Disposition', 'inline', filename='logo.png')
                    msg.attach(logo_image)
                except Exception as e:
                    logger.warning(f"Failed to attach logo: {str(e)}")
            
            # Add PDF attachment if provided
            if pdf_path and Path(pdf_path).exists():
                with open(pdf_path, 'rb') as f:
                    pdf_data = f.read()
                
                pdf_attachment = MIMEApplication(pdf_data, _subtype='pdf')
                pdf_attachment.add_header(
                    'Content-Disposition', 
                    'attachment', 
                    filename=pdf_filename or 'chat_results.pdf'
                )
                msg.attach(pdf_attachment)
            
            # Create secure connection and send
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(self.smtp_server, 465, timeout=10) as server:
                server.login(self.email_address, self.email_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        pdf_path: Optional[str] = None,
        pdf_filename: Optional[str] = None
    ) -> bool:
        """Asynchronously send email with optional PDF attachment"""
        if not self.email_address or not self.email_password:
            logger.error("Email credentials not configured")
            return False
        
        # Run the synchronous email sending in a thread pool
        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(
                self.executor,
                self._send_email_sync,
                to_email,
                subject,
                body,
                pdf_path,
                pdf_filename
            )
            return result
        except Exception as e:
            logger.error(f"Error in async email sending: {str(e)}")
            return False
    
    def create_chat_summary_email(
        self,
        user_name: str,
        query: str,
        agent_name: str,
    ) -> str:
        """Create HTML email body for chat summary"""
        # Check if logo is available for embedding
        logo_img_tag = ""
        if self.logo_path and Path(self.logo_path).exists():
            logo_img_tag = '<img src="cid:company_logo" alt="Discoverminds Logo" style="max-width: 150px; height: auto; margin-top: 10px;">'
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    Your Search Results
                </h2>
                
                <p>Hi {user_name or 'there'},</p>
                
                <p>Your search query has been completed! Here are the details:</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Query:</strong> {query}</p>
                    <p><strong>Agent:</strong> {agent_name}</p>
                </div>
                
                <p>Please find the detailed results and sources attached as a PDF document.</p>
                
                <p style="margin-top: 30px;">
                    Best regards,<br>
                    <strong>Team Discoverminds</strong>
                </p>
                
                <div style="text-align: center; margin-top: 20px;">
                    {logo_img_tag}
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #666; text-align: center;">
                    This email was automatically generated by Discoverminds Search. 
                    If you have any questions, please contact our support team.
                </p>
            </div>
        </body>
        </html>
        """

# Global email service instance
email_service = EmailService()
