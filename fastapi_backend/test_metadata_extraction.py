#!/usr/bin/env python3
import asyncio
import os
import sys
import json
from typing import List, Dict, Optional, Tuple, Any

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))

from supabase import create_client
from app.core.config import settings

USER_ID = "a5ee6e12-5c5b-4912-9207-8529ecdb8575"

class MetadataExtractor:
    def __init__(self):
        self.supabase_client = None
        
    async def initialize(self):
        """Initialize Supabase client"""
        print("Initializing Supabase client...")
        
        self.supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
    
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
    
    def create_basic_info_text(self, profile: Dict) -> str:
        """Create text for basic profile information"""
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
            
        return "\n".join(parts)
    
    def create_experience_text(self, experience: Dict) -> str:
        """Create text for a single experience entry"""
        parts = []
        if experience.get("position"):
            parts.append(f"Position: {experience['position']}")
        if experience.get("company"):
            parts.append(f"Company: {experience['company']}")
        if experience.get("location"):
            parts.append(f"Location: {experience['location']}")
        if experience.get("date_range"):
            parts.append(f"Duration: {experience['date_range']}")
        if experience.get("description"):
            parts.append(f"Description: {experience['description']}")
            
        return "\n".join(parts)
    
    def create_education_text(self, education: Dict) -> str:
        """Create text for a single education entry"""
        parts = []
        if education.get("institution"):
            parts.append(f"School: {education['institution']}")
        if education.get("degree"):
            parts.append(f"Degree: {education['degree']}")
        if education.get("field_of_study"):
            parts.append(f"Field of Study: {education['field_of_study']}")
        if education.get("date_range"):
            parts.append(f"Duration: {education['date_range']}")
        if education.get("description"):
            parts.append(f"Description: {education['description']}")
            
        return "\n".join(parts)
    
    def create_skills_text(self, skills: List[str]) -> str:
        """Create text for skills section"""
        if not skills:
            return ""
        return f"Skills: {', '.join(skills)}"
    
    def create_section_records(self, profile: Dict) -> List[Tuple[str, str, Dict[str, Any]]]:
        """Create separate records for each section of a LinkedIn profile"""
        records = []
        profile_id = profile.get('id')
        
        # Basic info section
        basic_info = self.create_basic_info_text(profile)
        if basic_info:
            records.append((
                f"{profile_id}_basic",  # Unique ID with section suffix
                basic_info,             # Text to be embedded
                {
                    "profile_id": profile_id,
                    "section": "basic_info",
                    "user_id": profile.get("user_id", USER_ID)
                }
            ))
        
        # Experience section
        if profile.get("experience_json"):
            for i, exp in enumerate(profile["experience_json"]):
                exp_text = self.create_experience_text(exp)
                if exp_text:
                    records.append((
                        f"{profile_id}_exp_{i}",
                        exp_text,
                        {
                            "profile_id": profile_id,
                            "section": "experience",
                            "company": exp.get("company", ""),
                            "position": exp.get("position", ""),
                            "user_id": profile.get("user_id", USER_ID)
                        }
                    ))
        
        # Education section
        if profile.get("education_json"):
            for i, edu in enumerate(profile["education_json"]):
                edu_text = self.create_education_text(edu)
                if edu_text:
                    records.append((
                        f"{profile_id}_edu_{i}",
                        edu_text,
                        {
                            "profile_id": profile_id,
                            "section": "education",
                            "school": edu.get("institution", ""),  # Use institution field instead of school
                            "user_id": profile.get("user_id", USER_ID)
                        }
                    ))
        
        # Skills section
        if profile.get("skills"):
            skills_text = self.create_skills_text(profile["skills"])
            if skills_text:
                records.append((
                    f"{profile_id}_skills",
                    skills_text,
                    {
                        "profile_id": profile_id,
                        "section": "skills",
                        "user_id": profile.get("user_id", USER_ID)
                    }
                ))
        
        return records
    
    def print_section_metadata(self, profile: Dict):
        """Print metadata for each section of a profile to check scraping quality"""
        print("\n===== PROFILE METADATA ANALYSIS =====")
        print(f"Profile ID: {profile.get('id')}")
        print(f"Name: {profile.get('first_name', '')} {profile.get('last_name', '')}")
        
        # Get section records
        section_records = self.create_section_records(profile)
        
        # Print metadata for each section
        for record_id, text, metadata in section_records:
            print(f"\n--- Section: {metadata.get('section')} ---")
            print(f"Record ID: {record_id}")
            print("Metadata:")
            for key, value in metadata.items():
                print(f"  {key}: {value}")
            print("Text Content:")
            print(f"  {text[:100]}..." if len(text) > 100 else f"  {text}")
            
        print("\n===== END OF METADATA ANALYSIS =====\n")
        
        return section_records
    
    def analyze_raw_profile(self, profile: Dict):
        """Analyze the raw profile data to check for missing fields"""
        print("\n===== RAW PROFILE DATA ANALYSIS =====")
        print(f"Profile ID: {profile.get('id')}")
        print(f"Name: {profile.get('first_name', '')} {profile.get('last_name', '')}")
        
        # Check basic fields
        basic_fields = ["headline", "company", "position", "location", "about_section", "linkedin_url"]
        print("\nBasic Fields:")
        for field in basic_fields:
            value = profile.get(field)
            status = "✅ Present" if value else "❌ Missing"
            print(f"  {field}: {status}")
        
        # Check experience fields
        if profile.get("experience_json"):
            print(f"\nExperience Entries: {len(profile['experience_json'])}")
            for i, exp in enumerate(profile["experience_json"]):
                print(f"\n  Experience #{i+1}:")
                exp_fields = ["position", "company", "location", "date_range", "description"]
                for field in exp_fields:
                    value = exp.get(field)
                    status = "✅ Present" if value else "❌ Missing"
                    print(f"    {field}: {status}")
        else:
            print("\nExperience: ❌ No entries")
        
        # Check education fields
        if profile.get("education_json"):
            print(f"\nEducation Entries: {len(profile['education_json'])}")
            for i, edu in enumerate(profile["education_json"]):
                print(f"\n  Education #{i+1}:")
                edu_fields = ["institution", "degree", "field_of_study", "date_range", "description"]
                for field in edu_fields:
                    value = edu.get(field)
                    status = "✅ Present" if value else "❌ Missing"
                    print(f"    {field}: {status}")
        else:
            print("\nEducation: ❌ No entries")
        
        # Check skills
        if profile.get("skills"):
            print(f"\nSkills: ✅ {len(profile['skills'])} skills present")
        else:
            print("\nSkills: ❌ No skills")
        
        print("\n===== END OF RAW PROFILE ANALYSIS =====\n")

    def save_to_json(self, profile: Dict, filename: str = "profile_analysis.json"):
        """Save the profile data and metadata to a JSON file for further analysis"""
        output = {
            "profile_id": profile.get("id"),
            "name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}",
            "basic_info": {
                "headline": profile.get("headline"),
                "company": profile.get("company"),
                "position": profile.get("position"),
                "location": profile.get("location"),
                "about_section": profile.get("about_section"),
                "linkedin_url": profile.get("linkedin_url")
            },
            "section_records": []
        }
        
        # Add section records
        section_records = self.create_section_records(profile)
        for record_id, text, metadata in section_records:
            output["section_records"].append({
                "record_id": record_id,
                "section": metadata.get("section"),
                "metadata": metadata,
                "text": text
            })
        
        # Add raw experience and education data
        if profile.get("experience_json"):
            output["raw_experience"] = profile["experience_json"]
        
        if profile.get("education_json"):
            output["raw_education"] = profile["education_json"]
        
        if profile.get("skills"):
            output["raw_skills"] = profile["skills"]
        
        # Save to file
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"Profile analysis saved to {filename}")

async def main():
    extractor = MetadataExtractor()
    await extractor.initialize()
    
    # Fetch all connections
    connections = await extractor.fetch_user_connections(USER_ID)
    if not connections:
        print("No connections found for testing")
        return
    
    # Find Suchit Singh's profile
    suchit_profile = None
    for profile in connections:
        if profile.get("first_name") == "Suchit" and profile.get("last_name") == "Singh":
            suchit_profile = profile
            break
    
    if suchit_profile:
        print(f"\n🔍 Found Suchit Singh's profile (ID: {suchit_profile.get('id')})")
        suchit_profile["user_id"] = USER_ID  # Ensure user_id is set
        
        # Print section metadata
        extractor.print_section_metadata(suchit_profile)
        
        # Analyze raw profile data
        extractor.analyze_raw_profile(suchit_profile)
        
        # Save analysis to JSON
        extractor.save_to_json(suchit_profile, "suchit_singh_profile.json")
    else:
        print("\n❌ Suchit Singh's profile not found")
        
        # If Suchit Singh not found, list all available profiles
        print("\n📋 Available profiles:")
        for i, profile in enumerate(connections[:10]):  # Show first 10 profiles
            print(f"{i+1}. {profile.get('first_name', '')} {profile.get('last_name', '')}")
        
        if len(connections) > 10:
            print(f"...and {len(connections) - 10} more profiles")
    
if __name__ == "__main__":
    asyncio.run(main())
