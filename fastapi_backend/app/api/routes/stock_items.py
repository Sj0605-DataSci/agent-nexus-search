"""
API endpoints for stock items processing
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any, List
import logging

from app.core.auth import get_current_user
from app.core.stock_items_worker import enqueue_stock_items_task
from app.db.clients import get_async_supabase_client
from app.core.profiling import profile_async
from app.core.structured_logger import get_structured_logger

router = APIRouter()
logger = get_structured_logger(__name__)

from pydantic import BaseModel, Field, validator
from app.models.schemas import StandardResponse

class StockItemsFileRequest(BaseModel):
    file_id: str = Field(..., description="UUID of the uploaded stock items file")
    
    @validator('file_id')
    def validate_file_id(cls, v):
        """Validate file_id is a valid UUID format"""
        import uuid
        try:
            uuid.UUID(v)
        except ValueError:
            raise ValueError('file_id must be a valid UUID')
        return v

@router.post("/process-stock-items-file", response_model=StandardResponse)
@profile_async("routes.stock_items.process_stock_items_file")
async def process_stock_items_file(
    request: StockItemsFileRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """
    Trigger processing of a stock items CSV file
    
    This endpoint is called after a file is uploaded to Supabase storage
    and a record is created in the stock_items_files table.
    
    Expected CSV format:
    - Headers: item_name, quantity, rate
    - item_name: Text (required)
    - quantity: Integer >= 0
    - rate: Decimal/Float >= 0
    """
    try:
        # Verify file exists and belongs to user
        supabase = await get_async_supabase_client()
        
        # Access user_id from the current_user object based on its actual structure
        user_id = current_user.id if hasattr(current_user, 'id') else current_user.get('id')
        if not user_id:
            logger.error("User ID not found in current_user object")
            raise HTTPException(status_code=401, detail="User ID not found")
            
        response = await supabase.table("stock_items_files").select("*").eq("id", request.file_id).eq("user_id", user_id).execute()
        
        if not response.data:
            logger.warning(f"Stock items file {request.file_id} not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Stock items file not found or does not belong to user")
        
        file_data = response.data[0]
        
        # Check if file is already being processed or completed
        if file_data.get('status') == 'processing':
            return StandardResponse(
                success=False,
                status_code=409,
                message="File is already being processed",
                data=None
            )
        
        if file_data.get('status') == 'completed':
            return StandardResponse(
                success=True,
                status_code=200,
                message="File has already been processed",
                data={"file_id": request.file_id, "status": "completed"}
            )
        
        logger.info(f"Enqueueing stock items file {request.file_id} for user {user_id}")
        
        # Enqueue the file for processing
        background_tasks.add_task(enqueue_stock_items_task, request.file_id)
        
        return StandardResponse(
            success=True,
            status_code=200,
            message="File queued for processing",
            data={"file_id": request.file_id, "status": "queued"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing stock items file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing stock items file: {str(e)}")
