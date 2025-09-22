"""
API endpoints for LinkedIn connections
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any, List
import logging

from app.core.auth import get_current_user
from app.core.connection_worker import enqueue_connection_task
from app.db.clients import get_async_supabase_client
from app.core.profiling import profile_async
from app.core.structured_logger import get_structured_logger

router = APIRouter()
logger = get_structured_logger(__name__)

from pydantic import BaseModel

class ConnectionFileRequest(BaseModel):
    file_id: str

@router.post("/process-connection-file")
@profile_async("routes.connections_processing.process_connection_file")
async def process_connection_file(
    request: ConnectionFileRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """
    Trigger processing of a LinkedIn connection file
    
    This endpoint is called after a file is uploaded to Supabase storage
    and a record is created in the connection_files table.
    """
    try:
        # Verify file exists and belongs to user
        supabase = await get_async_supabase_client()
        # Debug the current_user object
        logger.info(f"Current user: {current_user}")
        # Access user_id from the current_user object based on its actual structure
        user_id = current_user.id if hasattr(current_user, 'id') else current_user.get('id')
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
            
        response = await supabase.table("connection_files").select("*").eq("id", request.file_id).eq("user_id", user_id).execute()
        logger.info(f"Connection file response: {response}")
        
        response_connections = await supabase.table("profiles").update({"has_connections": "syncing"}).eq("id", user_id).execute()
        logger.info(f"Connection update response: {response_connections}")
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Connection file not found or does not belong to user")
            
        # Enqueue the file for processing
        background_tasks.add_task(enqueue_connection_task, request.file_id)
        
        return {"status": "success", "message": "File queued for processing"}
        
    except Exception as e:
        logger.error(f"Error processing connection file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing connection file: {str(e)}")
