from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import StandardResponse, StandardJSONResponse
from app.core.profiling import get_profiling_stats, reset_profiling_data, profile_async
from app.core.auth import get_current_user
from app.models.models import Profile

# Set up structured logging
from app.core.structured_logger import get_structured_logger
logger = get_structured_logger(__name__)

router = APIRouter(prefix="/profiling", tags=["profiling"])

@router.get("/stats", response_model=StandardResponse, response_class=StandardJSONResponse)
@profile_async("routes.profiling.get_stats")
async def get_stats(current_user: Profile = Depends(get_current_user)):
    """
    Get statistics for all profiled operations
    
    This endpoint returns timing statistics for all operations that have been profiled,
    including Supabase CRUD operations, Pydantic model conversions, and other key operations.
    """
    try:
        stats = get_profiling_stats()
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Profiling statistics retrieved successfully",
            data=stats
        ))
    except Exception as e:
        logger.exception("Error retrieving profiling statistics",
                       exception_type=type(e).__name__,
                       error_message=str(e))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))

@router.post("/reset", response_model=StandardResponse, response_class=StandardJSONResponse)
@profile_async("routes.profiling.reset_stats")
async def reset_stats(current_user: Profile = Depends(get_current_user)):
    """
    Reset all profiling statistics
    
    This endpoint clears all collected profiling data to start fresh measurements.
    """
    try:
        reset_profiling_data()
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Profiling statistics reset successfully",
            data=None
        ))
    except Exception as e:
        logger.exception("Error resetting profiling statistics",
                       exception_type=type(e).__name__,
                       error_message=str(e))
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"An unexpected error occurred: {str(e)}",
            data=None
        ))
