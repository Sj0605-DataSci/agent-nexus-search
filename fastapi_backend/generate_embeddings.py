#!/usr/bin/env python3
"""
Standalone script to generate embeddings for a specific user
Fetches connection records from database and creates vector embeddings
"""
import asyncio
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import quote_plus

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))

import vecs
from google import genai
from supabase import create_client, Client
from app.core.config import settings

# User ID from the logs (the one that failed)
USER_ID = "a5ee6e12-5c5b-4912-9207-8529ecdb8575"

class EmbeddingGenerator:
    def __init__(self):
        self.supabase_client = None
        self.vecs_client = None
        self.linkedin_profiles_collection = None
        self.gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        
    async def initialize(self):
        """Initialize Supabase and Vector DB clients"""
        print("Initializing clients...")
        
        # Initialize Supabase client
        self.supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        
        # Initialize Vector DB client with proper URL encoding
        if settings.SUPABASE_USER and settings.SUPABASE_PASSWORD and settings.SUPABASE_HOST and settings.SUPABASE_PORT and settings.SUPABASE_DBNAME:
            db_url = f"postgresql://{settings.SUPABASE_USER}:{quote_plus(settings.SUPABASE_PASSWORD)}@{settings.SUPABASE_HOST}:{settings.SUPABASE_PORT}/{settings.SUPABASE_DBNAME}?sslmode=require"
            print(f"Using constructed database URL for vector DB")
        else:
            db_url = settings.DATABASE_URL
            
        print(f"Connecting to vector DB...")
        self.vecs_client = vecs.create_client(db_url)
        
        # Create or get collection
        self.linkedin_profiles_collection = self.vecs_client.get_or_create_collection(
            name="linkedin_profiles",
            dimension=3072  # Gemini embedding dimension
        )
        
        # Create index separately if collection was just created
        try:
            self.linkedin_profiles_collection.create_index(
                method=vecs.IndexMethod.hnsw,
                measure=vecs.IndexMeasure.cosine_distance,
                index_arguments=vecs.IndexArgsHNSW(m=16, ef_construction=64)
            )
            print(f"Vector collection and index initialized: linkedin_profiles")
        except Exception as e:
            # Index might already exist, which is fine
            print(f"Vector collection initialized: linkedin_profiles (index may already exist: {e})")
        
    async def fetch_user_connections(self, user_id: str) -> List[Dict]:
        """Fetch enriched connection records for the user"""
        print(f"Fetching enriched connections for user: {user_id}")
        
        response = self.supabase_client.table("connections").select(
            "id, first_name, last_name, headline, about_section, experience_json, education_json, skills, linkedin_url, company, position, location, profile_photo_url"
        ).eq("user_id", user_id).or_(
            "experience_json.not.is.null,education_json.not.is.null,profile_photo_url.not.is.null"
        ).execute()
        
        connections = response.data
        print(f"Found {len(connections)} enriched connections for user {user_id}")
        
        # Additional filtering to ensure we have meaningful enriched data
        filtered_connections = []
        for conn in connections:
            has_enriched_data = (
                (conn.get('experience_json') and len(conn['experience_json']) > 0) or
                (conn.get('education_json') and len(conn['education_json']) > 0) or
                (conn.get('profile_photo_url') and conn['profile_photo_url'].strip())
            )
            if has_enriched_data:
                filtered_connections.append(conn)
        
        print(f"After filtering: {len(filtered_connections)} connections with meaningful enriched data")
        return filtered_connections
        
    def create_profile_text(self, profile: Dict) -> str:
        """Create comprehensive profile text for embedding generation"""
        parts = []
        
        # Basic info
        name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        if name:
            parts.append(f"Name: {name}")
            
        if profile.get('headline'):
            parts.append(f"Headline: {profile['headline']}")
            
        if profile.get('company'):
            parts.append(f"Company: {profile['company']}")
            
        if profile.get('position'):
            parts.append(f"Position: {profile['position']}")
            
        if profile.get('location'):
            parts.append(f"Location: {profile['location']}")
            
        # About section
        if profile.get('about_section'):
            parts.append(f"About: {profile['about_section']}")
            
        # Experience
        experience_json = profile.get('experience_json', [])
        if experience_json and isinstance(experience_json, list):
            exp_texts = []
            for exp in experience_json[:5]:  # Limit to top 5 experiences
                if isinstance(exp, dict):
                    exp_text = f"{exp.get('position', '')} at {exp.get('company', '')}"
                    if exp.get('description'):
                        exp_text += f": {exp['description']}"
                    exp_texts.append(exp_text)
            
            if exp_texts:
                parts.append(f"Experience: {'; '.join(exp_texts)}")
        
        # Education
        education_json = profile.get('education_json', [])
        if education_json and isinstance(education_json, list):
            edu_texts = []
            for edu in education_json[:3]:  # Limit to top 3 education entries
                if isinstance(edu, dict):
                    edu_text = f"{edu.get('degree', '')} from {edu.get('institution', '')}"
                    edu_texts.append(edu_text)
            
            if edu_texts:
                parts.append(f"Education: {'; '.join(edu_texts)}")
        
        # Skills
        skills = profile.get('skills', [])
        if skills and isinstance(skills, list):
            skills_text = ', '.join(skills[:10])  # Limit to top 10 skills
            parts.append(f"Skills: {skills_text}")
        
        return '\n'.join(parts)
    
    async def generate_gemini_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding using Gemini API"""
        try:
            result = self.gemini_client.models.embed_content(
                model="gemini-embedding-001",
                contents=text
            )
            
            if result.embeddings and len(result.embeddings) > 0:
                return result.embeddings[0].values
            else:
                return None
                
        except Exception as e:
            print(f"Error generating Gemini embedding: {str(e)}")
            return None
    
    async def generate_embeddings_for_user(self, user_id: str):
        """Generate embeddings for all profiles of a user"""
        print(f"\n=== Generating embeddings for user: {user_id} ===")
        
        # Fetch all connections
        connections = await self.fetch_user_connections(user_id)
        
        if not connections:
            print("No connections found for user")
            return
            
        successful_embeddings = 0
        failed_embeddings = 0
        
        for i, profile in enumerate(connections, 1):
            try:
                print(f"\nProcessing profile {i}/{len(connections)}: {profile.get('first_name', '')} {profile.get('last_name', '')}")
                
                # Create comprehensive profile text
                profile_text = self.create_profile_text(profile)
                print(f"Profile text length: {len(profile_text)} characters")
                
                if not profile_text.strip():
                    print("Skipping profile with no content")
                    continue
                
                # Generate embedding using Gemini
                embedding = await self.generate_gemini_embedding(profile_text)
                
                if embedding:
                    # Store embedding in vecs with metadata
                    self.linkedin_profiles_collection.upsert([
                        (
                            str(profile["id"]),  # Use connection ID as key
                            embedding,
                            {
                                "user_id": user_id,
                                "name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
                                "company": profile.get('company', ''),
                                "position": profile.get('position', ''),
                                "linkedin_url": profile.get('linkedin_url', '')
                            }
                        )
                    ])
                    
                    # Update connections table to mark embedding as generated
                    self.supabase_client.table("connections").update({
                        "embedding_generated_at": datetime.now().isoformat()
                    }).eq("id", profile["id"]).execute()
                    
                    print(f"✅ Generated and stored embedding for profile {profile['id']}")
                    successful_embeddings += 1
                else:
                    print(f"❌ Failed to generate embedding for profile {profile['id']}")
                    failed_embeddings += 1
                
                # Rate limiting
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"❌ Error processing profile {profile.get('id')}: {str(e)}")
                failed_embeddings += 1
                continue
        
        print(f"\n=== Summary ===")
        print(f"Total profiles: {len(connections)}")
        print(f"Successful embeddings: {successful_embeddings}")
        print(f"Failed embeddings: {failed_embeddings}")
        print(f"Success rate: {(successful_embeddings/len(connections)*100):.1f}%")

async def main():
    """Main function to run the embedding generation"""
    print("🚀 Starting embedding generation script")
    
    # Check required environment variables
    if not settings.GOOGLE_API_KEY:
        print("❌ GOOGLE_API_KEY not configured")
        return
        
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Supabase configuration missing")
        return
    
    generator = EmbeddingGenerator()
    
    try:
        await generator.initialize()
        await generator.generate_embeddings_for_user(USER_ID)
        print("\n✅ Embedding generation completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during embedding generation: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
