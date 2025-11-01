import os
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import Dict, Optional, List
import uuid
import time

# Load environment variables from .env file
load_dotenv()

# Source project (staging environment)
SOURCE_URL = os.environ.get("STAGING_SUPABASE_URL")
SOURCE_KEY = os.environ.get("STAGING_SUPABASE_SERVICE_ROLE_KEY")

# Target project (production environment)
TARGET_URL = os.environ.get("SUPABASE_URL")  # Assuming production variables don't have prefix
TARGET_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase clients
source_supabase: Client = create_client(SOURCE_URL, SOURCE_KEY)
target_supabase: Client = create_client(TARGET_URL, TARGET_KEY)

def migrate_connections_data(source_user_id, target_user_id):
    # 1. Get all connections for the source user with pagination
    page_size = 100  # Reduced from 1000 to avoid timeout
    start = 0
    all_source_connections = []
    max_retries = 3
    
    while True:
        retry_count = 0
        success = False
        
        while retry_count < max_retries and not success:
            try:
                print(f"Fetching connections {start} to {start + page_size - 1}...")
                source_connections = source_supabase.table("connections") \
                    .select("*") \
                    .eq("user_id", source_user_id) \
                    .not_.is_("enriched_at", "null") \
                    .not_.is_("embedding_generated_at", "null") \
                    .range(start, start + page_size - 1) \
                    .execute()
                
                success = True
            except Exception as e:
                retry_count += 1
                print(f"Error fetching connections (attempt {retry_count}/{max_retries}): {str(e)}")
                if retry_count < max_retries:
                    time.sleep(2)  # Wait before retry
                else:
                    raise
        
        if len(source_connections.data) == 0:
            break
            
        all_source_connections.extend(source_connections.data)
        print(f"Fetched {len(source_connections.data)} connections, total so far: {len(all_source_connections)}")
        
        if len(source_connections.data) < page_size:
            break
            
        start += page_size
        time.sleep(0.5)  # Small delay between pages to avoid overwhelming the database
    
    if len(all_source_connections) == 0:
        print(f"No connections found for source user {source_user_id}")
        return
        
    print(f"Found {len(all_source_connections)} connections for source user")
    
    # 2. Get all connections for the target user (also with pagination if needed)
    all_target_connections = []
    start = 0
    
    while True:
        target_connections = target_supabase.table("connections") \
            .select("*") \
            .eq("user_id", target_user_id) \
            .range(start, start + page_size - 1) \
            .execute()
        
        if len(target_connections.data) == 0:
            break
            
        all_target_connections.extend(target_connections.data)
        
        if len(target_connections.data) < page_size:
            break
            
        start += page_size
    
    # Create a map of LinkedIn URLs to target connections for quick lookup
    target_linkedin_map = {conn["linkedin_url"]: conn for conn in all_target_connections if "linkedin_url" in conn and conn["linkedin_url"]}
    
    # Continue with the rest of your function using all_source_connections instead of source_connections.data
    
    # 3. Process each source connection one by one
    updates = 0
    new_connections = 0
    
    for i, source_conn in enumerate(all_source_connections):
        if not source_conn.get("linkedin_url"):
            continue
            
        linkedin_url = source_conn["linkedin_url"]
        
        # Check if this LinkedIn URL exists in the target project
        if linkedin_url in target_linkedin_map:
            # Update existing connection
            target_conn = target_linkedin_map[linkedin_url]
            
            # Create an update dictionary with all fields from the schema
            update_data = {}
            fields_to_copy = [
                "first_name", "last_name", "email_address", "company", 
                "position", "connected_on", "headline", "source",
                "about_section", "experience_json", "education_json", 
                "skills", "location", "profile_photo_url", 
                "enriched_at", "enrichment_source", "embedding_generated_at",
                "basic_info_embedding", "experience_embedding", "updated_at",
                "about_tsv","education_tsv","experience_tsv"
            ]
            
            for field in fields_to_copy:
                # Only copy fields that exist in source and are missing or empty in target
                if field in source_conn and source_conn[field] and (
                    field not in target_conn or not target_conn[field]
                ):
                    update_data[field] = source_conn[field]
            
            if update_data:
                try:
                    # Update the target connection with enriched data
                    target_supabase.table("connections").update(update_data).eq("id", target_conn["id"]).execute()
                    updates += 1
                    if updates % 10 == 0:
                        print(f"Updated {updates} connections so far...")
                except Exception as e:
                    print(f"Error updating connection {linkedin_url}: {str(e)}")
        else:
            # Insert new connection one by one
            new_conn_data = {k: v for k, v in source_conn.items() if k != "id" and k != "user_id"}
            new_conn_data["user_id"] = target_user_id
            
            try:
                target_supabase.table("connections").insert(new_conn_data).execute()
                new_connections += 1
                if new_connections % 10 == 0:
                    print(f"Inserted {new_connections} new connections so far...")
                time.sleep(0.1)  # Small delay between inserts
            except Exception as e:
                print(f"Error inserting connection {linkedin_url}: {str(e)}")
    
    print(f"\n=== Migration Complete ===")
    print(f"Updated {updates} connections for user {target_user_id}")
    print(f"Created {new_connections} new connections for user {target_user_id}")
    print(f"Total processed: {updates + new_connections} connections")

if __name__ == "__main__":
    source_user_id="a5ee6e12-5c5b-4912-9207-8529ecdb8575"
    target_user_id="54fe4f63-bfc8-4cf0-a882-d4e76d9fb1a5"
    
    migrate_connections_data(source_user_id, target_user_id)