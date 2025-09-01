#!/usr/bin/env python3
import asyncio
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import quote_plus
import requests

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))

import vecs
from supabase import create_client
from app.core.config import settings

USER_ID = "a5ee6e12-5c5b-4912-9207-8529ecdb8575"
JINA_API_KEY = settings.JINA_API_KEY

class EmbeddingGenerator:
    def __init__(self):
        self.supabase_client = None
        self.vecs_client = None
        self.linkedin_profiles_collection = None
        
    async def initialize(self):
        """Initialize Supabase and Vector DB clients"""
        print("Initializing clients...")
        
        self.supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        
        if (
            settings.SUPABASE_USER
            and settings.SUPABASE_PASSWORD
            and settings.SUPABASE_HOST
            and settings.SUPABASE_PORT
            and settings.SUPABASE_DBNAME
        ):
            db_url = f"postgresql://{settings.SUPABASE_USER}:{quote_plus(settings.SUPABASE_PASSWORD)}@{settings.SUPABASE_HOST}:{settings.SUPABASE_PORT}/{settings.SUPABASE_DBNAME}?sslmode=require"
            print("Using constructed database URL for vector DB")
        else:
            db_url = settings.DATABASE_URL
            
        print("Connecting to vector DB...")
        self.vecs_client = vecs.create_client(db_url)
        
        # Jina v3 embeddings are 1536-D
        self.linkedin_profiles_collection = self.vecs_client.get_or_create_collection(
            name="linkedin_profiless",
            dimension=1024
        )
        
        try:
            self.linkedin_profiles_collection.create_index(
                method=vecs.IndexMethod.hnsw,
                measure=vecs.IndexMeasure.cosine_distance,
                index_arguments=vecs.IndexArgsHNSW(m=16, ef_construction=64),
            )
            print("Vector collection and index initialized: linkedin_profiles")
        except Exception as e:
            print(f"Vector collection initialized (index may already exist): {e}")
    
    async def fetch_user_connections(self, user_id: str) -> List[Dict]:
        print(f"Fetching enriched connections for user: {user_id}")
        
        response = self.supabase_client.table("connections").select(
            "id, first_name, last_name, headline, about_section, experience_json, education_json, skills, linkedin_url, company, position, location, profile_photo_url"
        ).eq("user_id", user_id).or_(
            "experience_json.not.is.null,education_json.not.is.null,profile_photo_url.not.is.null"
        ).execute()
        
        connections = response.data
        print(f"Found {len(connections)} enriched connections for user {user_id}")
        
        filtered = []
        for conn in connections:
            if (
                (conn.get("experience_json") and len(conn["experience_json"]) > 0)
                or (conn.get("education_json") and len(conn["education_json"]) > 0)
                or (conn.get("profile_photo_url") and conn["profile_photo_url"].strip())
            ):
                filtered.append(conn)
        
        print(f"After filtering: {len(filtered)} connections with enriched data")
        return filtered
    
    def create_profile_text(self, profile: Dict) -> str:
        parts = []
        name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        if name:
            parts.append(f"Name: {name}")
        if profile.get("headline"):
            parts.append(f"Headline: {profile['headline']}")
        if profile.get("company"):
            parts.append(f"Company: {profile['company']}")
        if profile.get("position"):
            parts.append(f"Position: {profile['position']}")
        if profile.get("location"):
            parts.append(f"Location: {profile['location']}")
        if profile.get("about_section"):
            parts.append(f"About: {profile['about_section']}")
        
        exp = profile.get("experience_json", [])
        if exp and isinstance(exp, list):
            exp_texts = []
            for e in exp[:5]:
                if isinstance(e, dict):
                    t = f"{e.get('position', '')} at {e.get('company', '')}"
                    if e.get("description"):
                        t += f": {e['description']}"
                    exp_texts.append(t)
            if exp_texts:
                parts.append(f"Experience: {'; '.join(exp_texts)}")
        
        edu = profile.get("education_json", [])
        if edu and isinstance(edu, list):
            edu_texts = []
            for e in edu[:3]:
                if isinstance(e, dict):
                    edu_texts.append(f"{e.get('degree', '')} from {e.get('institution', '')}")
            if edu_texts:
                parts.append(f"Education: {'; '.join(edu_texts)}")
        
        skills = profile.get("skills", [])
        if skills and isinstance(skills, list):
            parts.append(f"Skills: {', '.join(skills[:10])}")
        
        return "\n".join(parts)
    
    async def generate_jina_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding using Jina API"""
        try:
            url = "https://api.jina.ai/v1/embeddings"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {JINA_API_KEY}",
            }
            data = {
                "model": "jina-embeddings-v3",
                "task": "text-matching",
                "input": [text],
            }
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if "data" in result and len(result["data"]) > 0:
                return result["data"][0]["embedding"]
            return None
        except Exception as e:
            print(f"Error generating Jina embedding: {e}")
            return None
    
    async def generate_embeddings_for_user(self, user_id: str):
        print(f"\n=== Generating embeddings for user: {user_id} ===")
        connections = await self.fetch_user_connections(user_id)
        if not connections:
            print("No connections found")
            return
        
        ok, fail = 0, 0
        for i, profile in enumerate(connections, 1):
            try:
                print(f"\nProcessing {i}/{len(connections)}: {profile.get('first_name', '')} {profile.get('last_name', '')}")
                text = self.create_profile_text(profile)
                if not text.strip():
                    print("Skipping profile with no text")
                    continue
                
                embedding = await self.generate_jina_embedding(text)
                if embedding:
                    self.linkedin_profiles_collection.upsert([
                        (
                            str(profile["id"]),
                            embedding,
                            {
                                "user_id": user_id,
                                "name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
                                "company": profile.get('company', ''),
                                "position": profile.get('position', ''),
                                "linkedin_url": profile.get('linkedin_url', '')
                            },
                        )
                    ])
                    self.supabase_client.table("connections").update({
                        "embedding_generated_at": datetime.now().isoformat()
                    }).eq("id", profile["id"]).execute()
                    
                    print(f"✅ Stored embedding for {profile['id']}")
                    ok += 1
                else:
                    print(f"❌ No embedding for {profile['id']}")
                    fail += 1
                await asyncio.sleep(0.5)
            except Exception as e:
                print(f"❌ Error on {profile.get('id')}: {e}")
                fail += 1
        print(f"\n=== Summary ===\nTotal: {len(connections)} | OK: {ok} | Fail: {fail}")
        
async def main():
    print("🚀 Starting embedding generation with Jina")
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Supabase config missing")
        return
    gen = EmbeddingGenerator()
    await gen.initialize()
    await gen.generate_embeddings_for_user(USER_ID)

if __name__ == "__main__":
    asyncio.run(main())
