"""
Test script to diagnose Jina embedding issues
Fetches connections without embeddings and attempts to generate embeddings for them
"""
import os
import sys
import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the project directory to the path so we can import modules
sys.path.append('/Users/sanyamjain/Desktop/Projects/agent-nexus-search/fastapi_backend')

# Import required modules
from app.core.services.simplified_enrichment_service import SimplifiedEnrichmentService
from app.db.clients import get_async_supabase_client
from app.core.config import settings

# User ID to process (replace with your target user ID)
TARGET_USER_ID = "YOUR_USER_ID_HERE"

async def fetch_connections_without_embeddings(user_id: str):
    """
    Fetch connections without embeddings for the specified user
    """
    logger.info(f"Fetching connections without embeddings for user {user_id}")
    
    # Get Supabase client
    supabase = await get_async_supabase_client()
    
    # Query connections without embeddings - select all relevant fields directly
    response = await supabase.table("connections").select(
        "id, linkedin_url, headline, about_section, company, position, location, first_name, last_name, experience_json, education_json, skills, profile_photo_url, enriched_at"
    ).eq("user_id", user_id).is_("embedding_generated_at", None).not_.is_("enriched_at", None).execute()
    
    if not response.data:
        logger.warning(f"No connections found without embeddings for user {user_id}")
        return []
    
    logger.info(f"Found {len(response.data)} connections without embeddings")
    return response.data

async def test_single_embedding_generation(text: str):
    """
    Test generating a single embedding to diagnose issues
    """
    logger.info("Testing single embedding generation")
    logger.info(f"Text length: {len(text)}")
    
    # Initialize simplified enrichment service
    supabase = await get_async_supabase_client()
    enrichment_service = SimplifiedEnrichmentService(supabase_client=supabase)
    
    # Try to generate a single embedding
    try:
        start_time = time.time()
        embeddings = await enrichment_service.generate_batch_embeddings([text])
        elapsed_time = time.time() - start_time
        
        if embeddings and embeddings[0]:
            logger.info(f"Successfully generated embedding in {elapsed_time:.2f} seconds")
            logger.info(f"Embedding dimension: {len(embeddings[0])}")
            return True
        else:
            logger.error("Failed to generate embedding - returned None")
            return False
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        return False

async def process_connections_in_batches(connections: List[Dict], batch_size: int = 10):
    """
    Process connections in batches to generate embeddings
    """
    if not connections:
        logger.warning("No connections to process")
        return
    
    logger.info(f"Processing {len(connections)} connections in batches of {batch_size}")
    
    # Get Supabase client
    supabase = await get_async_supabase_client()
    
    # Initialize simplified enrichment service
    enrichment_service = SimplifiedEnrichmentService(supabase_client=supabase)
    
    # Process in batches
    for i in range(0, len(connections), batch_size):
        batch = connections[i:i+batch_size]
        logger.info(f"Processing batch {i//batch_size + 1}/{(len(connections) + batch_size - 1)//batch_size} with {len(batch)} connections")
        
        # Prepare data for batch processing
        valid_connections = []
        basic_info_texts = []
        experience_texts = []
        connection_map = {}  # Map to track index -> connection_id
        
        # Collect all texts that need embeddings
        for idx, conn in enumerate(batch):
            connection_id = conn.get("id")
            
            if not connection_id:
                logger.warning(f"Invalid connection in batch: missing id")
                continue
            
            # Create basic info text directly from connection fields
            basic_info_parts = []
            
            # Basic info
            name = f"{conn.get('first_name', '')} {conn.get('last_name', '')}" .strip()
            if name:
                basic_info_parts.append(f"Name: {name}")
            
            # Use URL if available and name is missing
            if not name and conn.get('linkedin_url'):
                basic_info_parts.append(f"LinkedIn URL: {conn.get('linkedin_url')}")
                
            if conn.get('headline'):
                basic_info_parts.append(f"Headline: {conn['headline']}")
                
            # About section
            if conn.get('about_section'):
                basic_info_parts.append(f"About: {conn['about_section']}")
            
            # Add company and position if available
            if conn.get('company'):
                basic_info_parts.append(f"Company: {conn['company']}")
                
            if conn.get('position'):
                basic_info_parts.append(f"Position: {conn['position']}")
                
            if conn.get('location'):
                basic_info_parts.append(f"Location: {conn['location']}")
            
            basic_info_text = "\n".join(basic_info_parts)
            
            # Create experience text directly from experience_json
            experience_json = conn.get('experience_json', [])
            experience_parts = ["Experience:"] if experience_json else []
            
            # Sort experiences by recency (current jobs first)
            if experience_json:
                sorted_exp = sorted(experience_json, key=lambda x: x.get("is_current", False), reverse=True)
                
                for exp in sorted_exp:
                    exp_parts = []
                    
                    # Focus on position and company
                    if exp.get("position"):
                        exp_parts.append(f"Position: {exp['position']}")
                    if exp.get("company"):
                        exp_parts.append(f"Company: {exp['company']}")
                        
                    # Add description (important for semantic search)
                    if exp.get("description"):
                        exp_parts.append(f"Description: {exp['description']}")
                        
                    experience_parts.append(" | ".join(exp_parts))
            
            experience_text = "\n".join(experience_parts)
            
            # Log text lengths to check for potential issues
            logger.info(f"Connection {connection_id}: Basic info text length: {len(basic_info_text)}, Experience text length: {len(experience_text)}")
            
            # Add to batch lists
            valid_connections.append({
                "id": connection_id
            })
            basic_info_texts.append(basic_info_text)
            experience_texts.append(experience_text)
            connection_map[idx] = connection_id
        
        # Generate embeddings in parallel batches
        logger.info(f"Generating embeddings for {len(valid_connections)} connections in parallel")
        
        try:
            # Process both embedding types in parallel using asyncio.gather
            start_time = time.time()
            basic_info_task = enrichment_service.generate_batch_embeddings(basic_info_texts)
            experience_task = enrichment_service.generate_batch_embeddings(experience_texts)
            
            # Wait for both embedding tasks to complete
            basic_info_embeddings, experience_embeddings = await asyncio.gather(basic_info_task, experience_task)
            elapsed_time = time.time() - start_time
            
            logger.info(f"Generated embeddings for batch in {elapsed_time:.2f} seconds")
            
            # Update connections with embeddings
            successful = 0
            failed = 0
            
            # Process results and update database
            for idx, connection in enumerate(valid_connections):
                connection_id = connection["id"]
                basic_info_embedding = basic_info_embeddings[idx] if idx < len(basic_info_embeddings) else None
                experience_embedding = experience_embeddings[idx] if idx < len(experience_embeddings) else None
                
                if not basic_info_embedding or not experience_embedding:
                    logger.warning(f"Failed to generate embeddings for connection {connection_id}")
                    failed += 1
                    continue
                
                # Update connection with embeddings
                embeddings = {
                    "basic_info_embedding": basic_info_embedding,
                    "experience_embedding": experience_embedding,
                    "embedding_generated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Update connection with embeddings
                try:
                    response = await supabase.table("connections").update(embeddings).eq(
                        "id", connection_id
                    ).execute()
                    
                    if response.data:
                        logger.info(f"Successfully updated embeddings for connection {connection_id}")
                        successful += 1
                    else:
                        logger.warning(f"Failed to update embeddings for connection {connection_id}")
                        failed += 1
                except Exception as e:
                    logger.error(f"Error updating embeddings for connection {connection_id}: {str(e)}")
                    failed += 1
            
            logger.info(f"Batch complete: {successful} successful, {failed} failed")
            
        except Exception as e:
            logger.error(f"Error processing batch: {str(e)}")
            # Try to get more details about the error
            if hasattr(e, "__dict__"):
                logger.error(f"Error details: {e.__dict__}")

async def debug_embedding_issues():
    """
    Main function to debug embedding issues
    """
    logger.info("Starting embedding debug script")
    
    # Fetch connections without embeddings
    connections = await fetch_connections_without_embeddings(TARGET_USER_ID)
    
    if not connections:
        logger.info("No connections to process, exiting")
        return
    
    # First, test with a single connection to diagnose issues
    if connections:
        test_conn = connections[0]
        
        # Create basic info text directly from connection fields
        basic_info_parts = []
        
        # Basic info
        name = f"{test_conn.get('first_name', '')} {test_conn.get('last_name', '')}" .strip()
        if name:
            basic_info_parts.append(f"Name: {name}")
        
        # Use URL if available and name is missing
        if not name and test_conn.get('linkedin_url'):
            basic_info_parts.append(f"LinkedIn URL: {test_conn.get('linkedin_url')}")
            
        if test_conn.get('headline'):
            basic_info_parts.append(f"Headline: {test_conn['headline']}")
            
        # About section
        if test_conn.get('about_section'):
            basic_info_parts.append(f"About: {test_conn['about_section']}")
        
        # Add company and position if available
        if test_conn.get('company'):
            basic_info_parts.append(f"Company: {test_conn['company']}")
            
        if test_conn.get('position'):
            basic_info_parts.append(f"Position: {test_conn['position']}")
            
        if test_conn.get('location'):
            basic_info_parts.append(f"Location: {test_conn['location']}")
        
        basic_info_text = "\n".join(basic_info_parts)
        
        # Create experience text directly from experience_json
        experience_json = test_conn.get('experience_json', [])
        experience_parts = ["Experience:"] if experience_json else []
        
        # Sort experiences by recency (current jobs first)
        if experience_json:
            sorted_exp = sorted(experience_json, key=lambda x: x.get("is_current", False), reverse=True)
            
            for exp in sorted_exp:
                exp_parts = []
                
                # Focus on position and company
                if exp.get("position"):
                    exp_parts.append(f"Position: {exp['position']}")
                if exp.get("company"):
                    exp_parts.append(f"Company: {exp['company']}")
                    
                # Add description (important for semantic search)
                if exp.get("description"):
                    exp_parts.append(f"Description: {exp['description']}")
                    
                experience_parts.append(" | ".join(exp_parts))
        
        experience_text = "\n".join(experience_parts)
        
        # Print the texts for inspection
        logger.info("Sample basic info text:")
        logger.info(basic_info_text[:500] + "..." if len(basic_info_text) > 500 else basic_info_text)
        
        logger.info("Sample experience text:")
        logger.info(experience_text[:500] + "..." if len(experience_text) > 500 else experience_text)
        
        # Test single embedding generation for each text type
        logger.info("Testing basic info embedding generation")
        basic_info_success = await test_single_embedding_generation(basic_info_text)
        
        logger.info("Testing experience embedding generation")
        experience_success = await test_single_embedding_generation(experience_text)
        
        if not basic_info_success or not experience_success:
            logger.error("Single embedding test failed, stopping batch processing")
            return
    
    # Process all connections in batches
    await process_connections_in_batches(connections, batch_size=5)
    
    logger.info("Embedding debug script completed")

if __name__ == "__main__":
    # If a user ID is provided as a command line argument, use it
    TARGET_USER_ID = "06f7e3ea-162c-46a4-a494-4459dd4bea10"
    
    # Run the async main function
    asyncio.run(debug_embedding_issues())
