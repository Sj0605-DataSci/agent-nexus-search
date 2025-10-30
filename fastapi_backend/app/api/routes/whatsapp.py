"""
WhatsApp Business API webhook endpoints for receiving and sending messages.
"""

from fastapi import APIRouter, Request, Query, HTTPException
from fastapi.responses import PlainTextResponse
import structlog
from typing import Dict, Any, Optional
import os
import asyncio

from app.core.config import settings
from app.core.services.whatsapp_service import whatsapp_service
from app.db.clients import get_async_supabase_client
from datetime import datetime

router = APIRouter()
logger = structlog.get_logger()

# WhatsApp configuration - will be added to config.py
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "your_verify_token_here")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API_VERSION = "v24.0"


def format_whatsapp_message(text: str) -> str:
    """
    Format agent response for WhatsApp to make it clean and readable.
    
    Features:
    - Adds proper spacing between sections
    - Formats product lists with emojis
    - Adds line breaks for readability
    - Keeps messages under 4096 chars (WhatsApp limit)
    """
    import re
    
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
    
    # Add emojis for common patterns
    text = re.sub(r'(?i)(price|rate|cost):\s*₹?\s*(\d+(?:\.\d{2})?)', r'💰 \1: ₹\2', text)
    text = re.sub(r'(?i)(product|item):\s*([^\n]+)', r'📦 \1: \2', text)
    text = re.sub(r'(?i)(quantity|stock):\s*(\d+)', r'📊 \1: \2', text)
    
    # Format lists with bullet points
    lines = text.split('\n')
    formatted_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            formatted_lines.append('')
            continue
            
        # If line looks like a list item (starts with number or dash)
        if re.match(r'^[\d\-\*•]\s*\.?\s*', line):
            # Clean up and add bullet emoji
            line = re.sub(r'^[\d\-\*•]\s*\.?\s*', '• ', line)
        
        formatted_lines.append(line)
    
    formatted_text = '\n'.join(formatted_lines)
    
    # Add greeting emoji if it's a greeting
    if re.search(r'(?i)^(hi|hello|hey|greetings)', formatted_text):
        formatted_text = '👋 ' + formatted_text
    
    # Ensure proper spacing after greeting
    formatted_text = re.sub(r'(👋[^\n]+)\n([^\n])', r'\1\n\n\2', formatted_text)
    
    # Truncate if too long (WhatsApp limit is 4096 chars)
    if len(formatted_text) > 4000:
        formatted_text = formatted_text[:3950] + '\n\n...(message truncated)'
    
    return formatted_text


@router.get("/webhook")
async def verify_webhook(
    mode: str = Query(alias="hub.mode"),
    verify_token: str = Query(alias="hub.verify_token"),
    challenge: str = Query(alias="hub.challenge")
):
    """
    Webhook verification endpoint for WhatsApp Business API.
    This is called once by Meta when you configure the webhook URL.
    
    Meta will send:
    - hub.mode: "subscribe"
    - hub.verify_token: Your verification token
    - hub.challenge: Random string to echo back
    """
    logger.info(
        "Webhook verification request received",
        mode=mode,
        verify_token_match=(verify_token == VERIFY_TOKEN)
    )
    
    if mode == "subscribe" and verify_token == VERIFY_TOKEN:
        logger.info("Webhook verified successfully")
        return PlainTextResponse(content=challenge, status_code=200)
    else:
        logger.error(
            "Webhook verification failed",
            mode=mode,
            token_match=(verify_token == VERIFY_TOKEN)
        )
        raise HTTPException(status_code=403, detail="Verification token mismatch")


@router.post("/webhook")
async def receive_webhook(request: Request):
    """
    Receive incoming messages and events from WhatsApp Business API.
    
    This endpoint receives:
    - Incoming messages from users
    - Message status updates (sent, delivered, read)
    - User profile updates
    """
    try:
        body = await request.json()
        logger.info("Received WhatsApp webhook", body=body)
        
        # Validate webhook structure
        if body.get("object") != "whatsapp_business_account":
            logger.warning("Invalid webhook object type", object=body.get("object"))
            return {"status": "ignored"}
        
        # Process entries
        for entry in body.get("entry", []):
            entry_id = entry.get("id")
            
            for change in entry.get("changes", []):
                field = change.get("field")
                value = change.get("value", {})
                
                # Handle different webhook types
                if field == "messages":
                    await handle_messages(value)
                elif field == "message_status":
                    await handle_message_status(value)
                else:
                    logger.info("Unhandled webhook field", field=field)
        
        return {"status": "ok"}
    
    except Exception as e:
        logger.error("Error processing webhook", error=str(e), exc_info=True)
        # Return 200 to prevent Meta from retrying
        return {"status": "error", "message": str(e)}


async def handle_messages(value: Dict[str, Any]):
    """
    Handle incoming messages from users.
    
    Args:
        value: The 'value' object from webhook containing messages
    """
    try:
        metadata = value.get("metadata", {})
        phone_number_id = metadata.get("phone_number_id")
        display_phone_number = metadata.get("display_phone_number")
        
        contacts = value.get("contacts", [])
        messages = value.get("messages", [])
        
        for message in messages:
            message_id = message.get("id")
            from_number = message.get("from")
            timestamp = message.get("timestamp")
            message_type = message.get("type")
            
            # Get contact name if available
            contact_name = None
            for contact in contacts:
                if contact.get("wa_id") == from_number:
                    contact_name = contact.get("profile", {}).get("name")
                    break
            
            logger.info(
                "Processing incoming message",
                message_id=message_id,
                from_number=from_number,
                contact_name=contact_name,
                message_type=message_type
            )
            
            # Handle different message types
            if message_type == "text":
                text_body = message.get("text", {}).get("body", "")
                await process_text_message(from_number, text_body, message_id, contact_name)
            
            elif message_type == "image":
                image_data = message.get("image", {})
                await process_media_message(from_number, "image", image_data, message_id)
            
            elif message_type == "audio":
                audio_data = message.get("audio", {})
                await process_media_message(from_number, "audio", audio_data, message_id)
            
            elif message_type == "video":
                video_data = message.get("video", {})
                await process_media_message(from_number, "video", video_data, message_id)
            
            elif message_type == "document":
                document_data = message.get("document", {})
                await process_media_message(from_number, "document", document_data, message_id)
            
            elif message_type == "location":
                location_data = message.get("location", {})
                await process_location_message(from_number, location_data, message_id)
            
            elif message_type == "reaction":
                reaction_data = message.get("reaction", {})
                logger.info("Received reaction", from_number=from_number, reaction=reaction_data)
            
            else:
                logger.warning("Unsupported message type", message_type=message_type)
                await whatsapp_service.send_text_message(
                    from_number,
                    "Sorry, I don't support that message type yet. Please send a text message."
                )
    
    except Exception as e:
        logger.error("Error handling messages", error=str(e), exc_info=True)


async def handle_message_status(value: Dict[str, Any]):
    """
    Handle message status updates (sent, delivered, read, failed).
    
    Args:
        value: The 'value' object from webhook containing status updates
    """
    try:
        statuses = value.get("statuses", [])
        
        for status in statuses:
            message_id = status.get("id")
            recipient_id = status.get("recipient_id")
            status_type = status.get("status")
            timestamp = status.get("timestamp")
            
            logger.info(
                "Message status update",
                message_id=message_id,
                recipient_id=recipient_id,
                status=status_type,
                timestamp=timestamp
            )
            
            # Handle errors
            if status_type == "failed":
                errors = status.get("errors", [])
                for error in errors:
                    logger.error(
                        "Message delivery failed",
                        message_id=message_id,
                        error_code=error.get("code"),
                        error_title=error.get("title"),
                        error_details=error.get("details")
                    )
    
    except Exception as e:
        logger.error("Error handling message status", error=str(e), exc_info=True)


async def process_text_message(
    from_number: str,
    message_text: str,
    message_id: str,
    contact_name: Optional[str] = None
):
    """
    Process incoming text message and trigger AI agent.
    
    Args:
        from_number: Sender's phone number
        message_text: The text message content
        message_id: WhatsApp message ID
        contact_name: Sender's name (if available)
    """
    try:
        logger.info(
            "Processing text message",
            from_number=from_number,
            message=message_text,
            contact_name=contact_name
        )
        
        # Mark message as read
        asyncio.create_task(whatsapp_service.mark_message_as_read(message_id))
        
        # Trigger AI agent processing in background
        # The AI agent will use the WhatsApp tool to send the response
        asyncio.create_task(
            process_with_ai_agent(
                from_number=from_number,
                message_text=message_text,
                contact_name=contact_name
            )
        )
        
        logger.info(
            "Message queued for AI processing",
            from_number=from_number,
            message_id=message_id
        )
        
    except Exception as e:
        logger.error("Error processing text message", error=str(e), exc_info=True)
        # Send error message directly
        await whatsapp_service.send_text_message(
            from_number,
            "Sorry, I encountered an error processing your message. Please try again."
        )


async def process_media_message(
    from_number: str,
    media_type: str,
    media_data: Dict[str, Any],
    message_id: str
):
    """
    Process incoming media messages (image, audio, video, document).
    
    Args:
        from_number: Sender's phone number
        media_type: Type of media (image, audio, video, document)
        media_data: Media metadata including ID, mime_type, etc.
        message_id: WhatsApp message ID
    """
    try:
        media_id = media_data.get("id")
        mime_type = media_data.get("mime_type")
        caption = media_data.get("caption", "")
        
        logger.info(
            "Processing media message",
            from_number=from_number,
            media_type=media_type,
            media_id=media_id,
            mime_type=mime_type,
            caption=caption
        )
        
        # TODO: Download and process media using media_id
        # URL to download: https://graph.facebook.com/v24.0/{media_id}
        
        response_text = f"Thanks for sending the {media_type}! Media processing is not yet implemented."
        await whatsapp_service.send_text_message(from_number, response_text)
        
    except Exception as e:
        logger.error("Error processing media message", error=str(e), exc_info=True)


async def process_location_message(
    from_number: str,
    location_data: Dict[str, Any],
    message_id: str
):
    """
    Process incoming location messages.
    
    Args:
        from_number: Sender's phone number
        location_data: Location data with latitude, longitude, name, address
        message_id: WhatsApp message ID
    """
    try:
        latitude = location_data.get("latitude")
        longitude = location_data.get("longitude")
        name = location_data.get("name", "")
        address = location_data.get("address", "")
        
        logger.info(
            "Processing location message",
            from_number=from_number,
            latitude=latitude,
            longitude=longitude,
            name=name
        )
        
        response_text = f"Thanks for sharing your location!\nLat: {latitude}, Long: {longitude}"
        if name:
            response_text += f"\nName: {name}"
        if address:
            response_text += f"\nAddress: {address}"
        
        await whatsapp_service.send_text_message(from_number, response_text)
        
    except Exception as e:
        logger.error("Error processing location message", error=str(e), exc_info=True)


async def process_with_ai_agent(
    from_number: str,
    message_text: str,
    contact_name: Optional[str] = None
):
    """
    Process message with AI agent (Tally graph).
    The AI agent will use the WhatsApp tool to send the response.
    
    Args:
        from_number: Sender's phone number
        message_text: The text message content
        contact_name: Sender's name (if available)
    """
    try:
        from app.core.services.agent.graph_tally import (
            tally_graph, 
            generate_thread_id, 
            get_conversation_history
        )
        from langchain_core.messages import HumanMessage, AIMessage
        import uuid
        
        logger.info(
            "Invoking AI agent",
            from_number=from_number,
            message=message_text,
            contact_name=contact_name,
            whatsapp_configured=whatsapp_service.is_configured()
        )
        
        # Get Supabase client
        supabase = await get_async_supabase_client()
        
        # Map WhatsApp phone numbers to actual user IDs from database
        # For now, use Ashish's user ID for WhatsApp queries (environment-aware)
        whatsapp_user_id = settings.ASHISH_USERID
        whatsapp_agent_id = settings.FOUNDERS_AGENTID  # Tally agent ID
        
        # Generate thread_id based on phone_number + today's date
        current_date = datetime.now()
        thread_id = generate_thread_id(from_number, current_date)
        
        # Generate trace_id for tracking (similar to chat_service)
        trace_id = str(uuid.uuid4())
        weave_url = f"whatsapp:{thread_id}:msg:{trace_id}"
        
        logger.info(
            "Thread ID generated",
            from_number=from_number,
            thread_id=thread_id,
            trace_id=trace_id,
            weave_url=weave_url,
            date=current_date.strftime("%Y-%m-%d")
        )
        
        # Check if thread exists, create if not
        existing_thread = await supabase.table("chat_threads").select("id").eq("id", thread_id).execute()
        
        if not existing_thread.data:
            # Create new thread
            thread_title = f"WhatsApp: {contact_name or from_number}"
            await supabase.table("chat_threads").insert({
                "id": thread_id,
                "user_id": whatsapp_user_id,
                "title": thread_title,
                "weave_url": weave_url,  # Add tracing URL
                "device_type": "whatsapp",
                "device_id": from_number
            }).execute()
            
            logger.info(
                "Created new WhatsApp thread",
                thread_id=thread_id,
                from_number=from_number,
                title=thread_title
            )
        
        # Retrieve conversation history for this thread
        conversation_history = await get_conversation_history(
            supabase,
            thread_id,
            limit=10  # Last 10 messages for context
        )
        
        logger.info(
            "Conversation history retrieved",
            thread_id=thread_id,
            history_count=len(conversation_history)
        )
        
        # Prepare initial state matching TallyState structure
        initial_state = {
            "messages": [
                HumanMessage(
                    content=f"User {contact_name or from_number} asks: {message_text}"
                )
            ],
            "trace_id": str(uuid.uuid4()),
            "query": message_text,
            "product_info": None,
            "final_answer": None,
            "user_id": whatsapp_user_id,
            "thread_id": thread_id,
            "conversation_history": conversation_history,
            "weave_url": weave_url  # Pass trace URL to agent
        }
        
        # Invoke the agent graph
        result = await tally_graph.ainvoke(initial_state)
        
        logger.info(
            "AI agent completed processing",
            from_number=from_number,
            has_final_answer=bool(result.get("final_answer"))
        )
        
        # Extract the final response from the agent
        final_response = None
        messages = result.get("messages", [])
        
        # Get the last AI message as the final response
        for msg in reversed(messages):
            if isinstance(msg, AIMessage) and msg.content:
                final_response = msg.content
                break
        
        # Send the final response via WhatsApp
        if final_response:
            # Format the response for WhatsApp
            formatted_response = format_whatsapp_message(final_response)
            
            logger.info(
                "Sending final response to WhatsApp",
                from_number=from_number,
                response_preview=formatted_response[:100]
            )
            
            # Store the conversation in database
            try:
                # Get thread_id and agent_id from initial_state
                thread_id = initial_state.get("thread_id")
                user_id = initial_state.get("user_id")
                agent_id = whatsapp_agent_id
                
                # Store message in chat_messages table (matching schema)
                await supabase.table("chat_messages").insert({
                    "user_id": user_id,
                    "agent_id": agent_id,  # Required field
                    "chat_thread_id": thread_id,
                    "main_query": message_text,
                    "message": {"content": final_response},  # JSONB format
                    "weave_url": weave_url,  # Tracing URL for debugging
                    "device_type": "whatsapp",
                    "device_id": from_number,
                    "endpoint": "whatsapp_webhook"
                }).execute()
                
                logger.info(
                    "Message stored in database",
                    thread_id=thread_id,
                    from_number=from_number
                )
            except Exception as db_error:
                logger.error(
                    "Failed to store message in database",
                    error=str(db_error),
                    thread_id=thread_id
                )
            
            # Send message and log the result
            send_result = await whatsapp_service.send_text_message(from_number, formatted_response)
            
            if send_result.get("success"):
                logger.info(
                    "WhatsApp message sent successfully",
                    from_number=from_number,
                    message_id=send_result.get("message_id")
                )
            else:
                logger.error(
                    "Failed to send WhatsApp message",
                    from_number=from_number,
                    error=send_result.get("error"),
                    status_code=send_result.get("status_code")
                )
        else:
            logger.warning(
                "No final response generated by agent",
                from_number=from_number
            )
            await whatsapp_service.send_text_message(
                from_number,
                "I'm sorry, I couldn't process your request. Please try again."
            )
        
    except Exception as e:
        logger.error(
            "Error in AI agent processing",
            from_number=from_number,
            error=str(e),
            exc_info=True
        )
        # Send error message as fallback
        await whatsapp_service.send_text_message(
            from_number,
            "Sorry, I encountered an error processing your request. Please try again later."
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for WhatsApp webhook service"""
    config_status = {
        "verify_token_set": bool(VERIFY_TOKEN and VERIFY_TOKEN != "your_verify_token_here"),
        "access_token_set": bool(WHATSAPP_TOKEN),
        "phone_number_id_set": bool(PHONE_NUMBER_ID)
    }
    
    return {
        "status": "ok",
        "service": "whatsapp_webhook",
        "configuration": config_status,
        "api_version": WHATSAPP_API_VERSION
    }
