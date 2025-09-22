import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Request
from app.core.auth import get_current_user
from app.models.models import Profile
from app.db.clients import get_async_supabase_client
from app.core.structured_logger import get_structured_logger
from app.core.config import settings
import httpx
import json

router = APIRouter()
logger = get_structured_logger(__name__)

@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_connections_file(
    file: UploadFile = File(...),
    current_user: Profile = Depends(get_current_user),
    request: Request = None
):
    """
    Uploads a CSV file of connections to Supabase storage and triggers processing.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only CSV files are accepted."
        )

    try:
        supabase = await get_async_supabase_client()
        user_id = current_user.id
        file_id = str(uuid.uuid4())
        file_path = f"{user_id}/{file_id}.csv"

        # Upload file to Supabase storage using direct REST API call (like frontend)
        logger.info(f"Uploading file {file.filename} to Supabase path {file_path}")
        contents = await file.read()
        
        # Get the user's token from the request headers
        token = None
        if request and request.headers.get("Authorization"):
            auth_header = request.headers.get("Authorization")
            if auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                logger.info("Found authorization token in request headers")
        
        # If no token in request headers, try to get from localStorage (for testing)
        if not token:
            logger.warning("No token found in request headers, authentication may fail")
        
        # Get Supabase URL and key from settings
        supabase_url = settings.SUPABASE_URL
        supabase_key = settings.SUPABASE_ANON_KEY
        
        # Make direct REST API call to Supabase Storage using httpx
        async with httpx.AsyncClient() as client:
            headers = {
                'Authorization': f'Bearer {token}' if token else '',
                'apikey': supabase_key
            }
            
            upload_url = f"{supabase_url}/storage/v1/object/connection-files/{file_path}"
            logger.info(f"Making direct REST API call to: {upload_url}")
            
            # Create form data with httpx
            files = {
                'file': (file.filename, contents, 'text/csv')
            }
            data = {
                'cacheControl': '3600'
            }
            
            upload_response = await client.post(
                upload_url,
                headers=headers,
                files=files,
                data=data
            )
            
            if upload_response.status_code >= 300:
                logger.error(f"Failed to upload file to Supabase. Status: {upload_response.status_code}, Response: {upload_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload file: {upload_response.text}"
                )
                
            logger.info(f"Successfully uploaded file to Supabase. Path: {file_path}")
            
            # Try to get the public URL of the file
            try:
                # Parse the response to get the file URL
                response_data = upload_response.json()
                file_url = f"{supabase_url}/storage/v1/object/public/connection-files/{file_path}"
                logger.info(f"Generated public URL for file: {file_url}")
            except Exception as e:
                logger.warning(f"Failed to get public URL for file: {str(e)}")
                file_url = None

        # Check if a record already exists for this user
        existing_record = await supabase.table("connection_files").select("id").eq("user_id", user_id).execute()
        
        if existing_record.data and len(existing_record.data) > 0:
            # Update existing record
            logger.info(f"Updating existing connection file record for user {user_id}")
            db_response = await supabase.table("connection_files").update({
                "file_name": file.filename,
                "file_url": file_url or f"{supabase_url}/storage/v1/object/public/connection-files/{file_path}",
                "status": "pending",
                "error_message": None,  # Clear any previous errors
                "updated_at": "now()"
            }).eq("user_id", user_id).execute()
            
            # Get the existing file ID
            file_id = existing_record.data[0]["id"]
        else:
            # Insert a new record
            logger.info(f"Creating new connection file record for user {user_id}")
            db_response = await supabase.table("connection_files").insert({
                "id": file_id,
                "user_id": user_id,
                "file_name": file.filename,
                "file_url": file_url or f"{supabase_url}/storage/v1/object/public/connection-files/{file_path}",
                "status": "pending"
            }).execute()

        if db_response.data is None and db_response.error is not None:
            logger.error(f"Failed to create database record for file {file_id}. Error: {db_response.error.message}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create database record: {db_response.error.message}"
            )

        logger.info(f"Successfully created database record for file ID: {file_id}")

        # Now call the process-connection-file endpoint, just like the frontend does
        api_url = f"{os.environ.get('API_URL', 'http://localhost:8000')}/api/process-connection-file"
        
        # Get the token from the request headers - this is the most reliable source
        token = None
        if request and request.headers.get("Authorization"):
            token = request.headers.get("Authorization")
            # Make sure we have the full header, not just the token
            if not token.startswith("Bearer "):
                token = f"Bearer {token}"
        
        logger.info(f"Using authorization token for processing: {token[:20]}..." if token else "No token available")
        
        headers = {
            "Content-Type": "application/json"
        }
        
        if token:
            headers["Authorization"] = token
        
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Calling process-connection-file endpoint with file_id: {file_id}")
                response = await client.post(
                    api_url,
                    json={"file_id": file_id},
                    headers=headers
                )
                
                logger.info(f"Process endpoint response status: {response.status_code}")
                
                if response.status_code >= 400:
                    logger.error(f"Error calling process-connection-file endpoint: {response.status_code} {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to process file: {response.status_code}: {response.text}"
                    )
                    
                logger.info(f"Successfully called process-connection-file endpoint for file ID: {file_id}")
            except Exception as e:
                logger.error(f"Exception calling process-connection-file endpoint: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to process file: {str(e)}"
                )

        return {
            "message": "File uploaded and processing started.",
            "file_id": file_id
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error uploading connections file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )
