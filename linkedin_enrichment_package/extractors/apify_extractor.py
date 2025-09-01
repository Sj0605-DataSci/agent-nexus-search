"""
Apify data extractor for LinkedIn profiles
"""
import re
from typing import Dict, Any, List, Optional
from ..models import ProfileData
from ..exceptions import ExtractionError

class ApifyExtractor:
    """Extracts structured data from Apify LinkedIn profile responses"""
    
    @staticmethod
    def extract_profile_data(apify_response: Dict[str, Any]) -> ProfileData:
        """
        Extract ProfileData from Apify response
        
        Args:
            apify_response: Raw response from Apify LinkedIn scraper
            
        Returns:
            ProfileData: Structured profile data
            
        Raises:
            ExtractionError: If extraction fails
        """
        try:
            # Handle nested element structure
            if 'element' in apify_response:
                data = apify_response['element']
            else:
                data = apify_response
            
            # Extract basic information
            first_name = data.get('firstName', '')
            last_name = data.get('lastName', '')
            full_name = f"{first_name} {last_name}".strip()
            
            # Extract location
            location = ""
            if 'location' in data:
                loc_data = data['location']
                if isinstance(loc_data, dict):
                    if 'parsed' in loc_data and loc_data['parsed']:
                        location = loc_data['parsed'].get('text', '')
                    elif 'linkedinText' in loc_data:
                        location = loc_data['linkedinText']
                elif isinstance(loc_data, str):
                    location = loc_data
            
            # Extract current position and company
            current_company = ""
            current_position = ""
            
            if 'currentPosition' in data and data['currentPosition']:
                current_pos = data['currentPosition'][0] if isinstance(data['currentPosition'], list) else data['currentPosition']
                current_company = current_pos.get('companyName', '')
                current_position = current_pos.get('position', '')
            
            # Extract experience
            experience = []
            if 'experience' in data and data['experience']:
                for exp in data['experience']:
                    experience_item = {
                        'company': exp.get('companyName', ''),
                        'position': exp.get('position', ''),
                        'duration': exp.get('duration', ''),
                        'start_date': ApifyExtractor._extract_date(exp.get('startDate')),
                        'end_date': ApifyExtractor._extract_date(exp.get('endDate')),
                        'description': exp.get('description', ''),
                        'location': exp.get('location', '')
                    }
                    experience.append(experience_item)
            
            # Extract education
            education = []
            if 'education' in data and data['education']:
                for edu in data['education']:
                    education_item = {
                        'school': edu.get('schoolName', ''),
                        'degree': edu.get('degree', ''),
                        'field': edu.get('fieldOfStudy', ''),
                        'start_date': ApifyExtractor._extract_date(edu.get('startDate')),
                        'end_date': ApifyExtractor._extract_date(edu.get('endDate')),
                        'period': edu.get('period', ''),
                        'description': edu.get('description', '')
                    }
                    education.append(education_item)
            
            # Extract skills
            skills = []
            if 'topSkills' in data and data['topSkills']:
                # Handle both string and list formats
                skills_data = data['topSkills']
                if isinstance(skills_data, str):
                    # Split by common delimiters
                    skills = [skill.strip() for skill in re.split(r'[•,\n]', skills_data) if skill.strip()]
                elif isinstance(skills_data, list):
                    skills = [str(skill).strip() for skill in skills_data if skill]
            
            # Create ProfileData object
            profile_data = ProfileData(
                first_name=first_name,
                last_name=last_name,
                full_name=full_name,
                headline=data.get('headline', ''),
                linkedin_url=data.get('linkedinUrl', ''),
                profile_image_url=data.get('profilePicture', ''),
                location=location,
                current_company=current_company,
                current_position=current_position,
                about_section=data.get('about', ''),
                connections_count=ApifyExtractor._safe_int(data.get('connectionsCount', 0)),
                followers_count=ApifyExtractor._safe_int(data.get('followerCount', 0)),
                experience=experience,
                education=education,
                skills=skills,
                source="apify",
                raw_data=data
            )
            
            return profile_data
            
        except Exception as e:
            raise ExtractionError(f"Failed to extract Apify profile data: {str(e)}")
    
    @staticmethod
    def extract_batch_profiles(apify_responses: List[Dict[str, Any]]) -> List[ProfileData]:
        """
        Extract multiple profiles from Apify batch response
        
        Args:
            apify_responses: List of Apify responses
            
        Returns:
            List[ProfileData]: List of extracted profile data
        """
        profiles = []
        for response in apify_responses:
            try:
                profile = ApifyExtractor.extract_profile_data(response)
                profiles.append(profile)
            except ExtractionError as e:
                # Log error but continue with other profiles
                print(f"Warning: Failed to extract profile: {e}")
                continue
        
        return profiles
    
    @staticmethod
    def _extract_date(date_obj: Any) -> str:
        """Extract date string from various date formats"""
        if not date_obj:
            return ""
        
        if isinstance(date_obj, dict):
            if 'text' in date_obj:
                return str(date_obj['text'])
            elif 'year' in date_obj:
                return str(date_obj['year'])
        elif isinstance(date_obj, (str, int)):
            return str(date_obj)
        
        return ""
    
    @staticmethod
    def _safe_int(value: Any) -> int:
        """Safely convert value to integer"""
        try:
            if isinstance(value, (int, float)):
                return int(value)
            elif isinstance(value, str):
                # Remove commas and other formatting
                clean_value = re.sub(r'[^\d]', '', value)
                return int(clean_value) if clean_value else 0
            return 0
        except (ValueError, TypeError):
            return 0
