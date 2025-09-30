#!/usr/bin/env python3
import asyncio
import os
import sys
from dotenv import load_dotenv
from app.db.clients import get_async_supabase_client

# Load environment variables from .env file if it exists
load_dotenv()

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_fetch_user_profile(user_id):
    """Test fetching user profile data from Supabase."""
    try:
        # Get Supabase client
        supabase = await get_async_supabase_client()
        
        # Log the user ID we're testing with
        logger.info(f"Fetching profile for user_id: {user_id}")
        
        # Fetch user email and full name from profiles table
        user_profile_response = await supabase.table("profiles").select("email,full_name").eq("id", user_id).execute()
        
        # Log the raw response
        logger.info(f"Raw response: {user_profile_response}")
        
        if user_profile_response.data and len(user_profile_response.data) > 0:
            # Check if we got data back
            logger.info(f"Response data: {user_profile_response.data}")
            
            # Extract user email and name
            user_data = user_profile_response.data[0]  # First item in the data array
            user_email = user_data.get("email")
            user_full_name = user_data.get("full_name", "")
            user_name = user_full_name.split(" ")[0] if user_full_name else ""
            
            logger.info(f"Extracted email: {user_email}")
            logger.info(f"Extracted full name: {user_full_name}")
            logger.info(f"Extracted first name: {user_name}")
            
            # Test the update operation (commented out to avoid actual updates)
            # response_connections = await supabase.table("profiles").update({"has_connections": "synced"}).eq("id", user_id).execute()
            # logger.info(f"Update response: {response_connections}")
            
            # Construct email subject line as in the original code
            subject = f"{user_name + ', your' if user_name else 'Your'} Connections Are Ready!"
            logger.info(f"Email subject would be: {subject}")
            
            return {
                "success": True,
                "email": user_email,
                "name": user_name,
                "full_name": user_full_name,
                "subject": subject
            }
        else:
            logger.error(f"No data found for user_id: {user_id}")
            return {"success": False, "error": "No user data found"}
            
    except Exception as e:
        logger.error(f"Error fetching user profile: {str(e)}")
        return {"success": False, "error": str(e)}

async def main():
    """Main function to run the test."""
    # Check if user ID is provided as command line argument
    
    user_id = "594294a3-5a6a-407d-a9ec-329bf0e08ab1"
    
    logger.info("Starting test...")
    result = await test_fetch_user_profile(user_id)
    
    if result["success"]:
        logger.info("Test completed successfully!")
        logger.info(f"User email: {result['email']}")
        logger.info(f"User name: {result['name']}")
    else:
        logger.error(f"Test failed: {result['error']}")

if __name__ == "__main__":
    asyncio.run(main())
