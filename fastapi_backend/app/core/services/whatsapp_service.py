"""
WhatsApp Business API service for sending and managing messages.
"""

import httpx
import structlog
from typing import Dict, Any, Optional
import os

from app.core.config import settings

logger = structlog.get_logger()

# WhatsApp configuration
WHATSAPP_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API_VERSION = "v24.0"


class WhatsAppService:
    """Service for WhatsApp Business API operations"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(WhatsAppService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the service"""
        if not self._initialized:
            self.token = WHATSAPP_TOKEN
            self.phone_number_id = PHONE_NUMBER_ID
            self.api_version = WHATSAPP_API_VERSION
            self.base_url = f"https://graph.facebook.com/{self.api_version}"
            self._initialized = True
    
    def is_configured(self) -> bool:
        """Check if WhatsApp credentials are configured"""
        return bool(self.token and self.phone_number_id)
    
    async def send_text_message(
        self,
        to_phone: str,
        message: str,
        preview_url: bool = False
    ) -> Dict[str, Any]:
        """
        Send a text message via WhatsApp Cloud API.
        
        Args:
            to_phone: Recipient's phone number (with country code, no + sign)
            message: Message text to send
            preview_url: Whether to show URL preview
        
        Returns:
            API response dictionary with success status and message_id
        """
        try:
            if not self.is_configured():
                logger.error("WhatsApp credentials not configured")
                return {
                    "success": False,
                    "error": "WhatsApp not configured",
                    "message": "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID"
                }
            
            # Remove + sign if present
            to_phone = to_phone.replace("+", "").strip()
            
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_phone,
                "type": "text",
                "text": {
                    "preview_url": preview_url,
                    "body": message
                }
            }
            
            logger.info(
                "Sending WhatsApp message",
                to=to_phone,
                message_length=len(message)
            )
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()
                
                if response.status_code == 200:
                    message_id = response_data.get("messages", [{}])[0].get("id")
                    logger.info(
                        "Message sent successfully",
                        to=to_phone,
                        message_id=message_id
                    )
                    return {
                        "success": True,
                        "message_id": message_id,
                        "to": to_phone
                    }
                else:
                    logger.error(
                        "Failed to send message",
                        status=response.status_code,
                        response=response_data
                    )
                    return {
                        "success": False,
                        "error": response_data.get("error", {}).get("message", "Unknown error"),
                        "status_code": response.status_code
                    }
        
        except Exception as e:
            logger.error("Error sending WhatsApp message", error=str(e), exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en_US",
        components: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Send a template message via WhatsApp Cloud API.
        
        Args:
            to_phone: Recipient's phone number
            template_name: Name of the approved template
            language_code: Language code (default: en_US)
            components: Template components (parameters, buttons, etc.)
        
        Returns:
            API response dictionary
        """
        try:
            if not self.is_configured():
                logger.error("WhatsApp credentials not configured")
                return {"success": False, "error": "WhatsApp not configured"}
            
            to_phone = to_phone.replace("+", "").strip()
            
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": to_phone,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {
                        "code": language_code
                    }
                }
            }
            
            if components:
                payload["template"]["components"] = components
            
            logger.info(
                "Sending WhatsApp template message",
                to=to_phone,
                template=template_name
            )
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response_data = response.json()
                
                if response.status_code == 200:
                    message_id = response_data.get("messages", [{}])[0].get("id")
                    logger.info(
                        "Template message sent successfully",
                        to=to_phone,
                        message_id=message_id
                    )
                    return {
                        "success": True,
                        "message_id": message_id,
                        "to": to_phone
                    }
                else:
                    logger.error(
                        "Failed to send template message",
                        status=response.status_code,
                        response=response_data
                    )
                    return {
                        "success": False,
                        "error": response_data.get("error", {}).get("message", "Unknown error"),
                        "status_code": response.status_code
                    }
        
        except Exception as e:
            logger.error("Error sending template message", error=str(e), exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def mark_message_as_read(self, message_id: str) -> Dict[str, Any]:
        """
        Mark a message as read.
        
        Args:
            message_id: WhatsApp message ID to mark as read
        
        Returns:
            API response dictionary
        """
        try:
            if not self.is_configured():
                return {"success": False, "error": "WhatsApp not configured"}
            
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code == 200:
                    logger.info("Message marked as read", message_id=message_id)
                    return {"success": True}
                else:
                    logger.error(
                        "Failed to mark message as read",
                        status=response.status_code,
                        message_id=message_id
                    )
                    return {"success": False, "status_code": response.status_code}
        
        except Exception as e:
            logger.error("Error marking message as read", error=str(e), exc_info=True)
            return {"success": False, "error": str(e)}


# Singleton instance
whatsapp_service = WhatsAppService()
