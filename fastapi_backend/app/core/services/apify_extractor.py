"""
Apify LinkedIn Profile Data Extractor
Extracts structured data from Apify LinkedIn scraper JSON responses
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

def extract_apify_profile_data(apify_response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract structured LinkedIn profile data from Apify response
    
    Args:
        apify_response: Raw Apify JSON response
        
    Returns:
        Standardized profile data dictionary matching database schema
    """
    try:
        # Extract the main element data
        element = apify_response.get('element', {})
        
        # Basic profile information
        profile_data = {
            # Basic Info (matching connections table schema)
            "first_name": element.get('firstName', ''),
            "last_name": element.get('lastName', ''),
            "linkedin_url": element.get('linkedinUrl', ''),
            "headline": element.get('headline', ''),
            "about_section": element.get('about', ''),
            "location": _extract_location(element),
            "email_address": None,  # Apify doesn't provide email in basic mode
            "company": _extract_current_company(element),
            "position": _extract_current_position(element),
            "connected_on": None,  # Not available from Apify
            "source": "apify",
            
            # Additional structured data for embeddings
            "experience_json": _extract_experience(element),
            "education_json": _extract_education(element),
            "skills": _extract_skills(element),
            "connections_count": element.get('connectionsCount', 0),
            "followers_count": element.get('followerCount', 0),
            "profile_photo_url": element.get('photo', ''),
            "premium": element.get('premium', False),
            "influencer": element.get('influencer', False),
            "verified": element.get('verified', False),
            "open_to_work": element.get('openToWork', False),
            "hiring": element.get('hiring', False),
            
            # Metadata
            "extraction_date": datetime.now().isoformat(),
            "apify_profile_id": element.get('id', ''),
            "public_identifier": element.get('publicIdentifier', ''),
        }
        
        return profile_data
        
    except Exception as e:
        print(f"Error extracting Apify profile data: {str(e)}")
        return None

def _extract_location(element: Dict[str, Any]) -> str:
    """Extract location from Apify element"""
    location_data = element.get('location', {})
    if isinstance(location_data, dict):
        # Try parsed location first
        parsed = location_data.get('parsed', {})
        if parsed:
            city = parsed.get('city', '')
            state = parsed.get('state', '')
            country = parsed.get('country', '')
            parts = [part for part in [city, state, country] if part]
            if parts:
                return ', '.join(parts)
        
        # Fallback to LinkedIn text
        linkedin_text = location_data.get('linkedinText', '')
        if linkedin_text:
            return linkedin_text
    
    return ''

def _extract_current_company(element: Dict[str, Any]) -> str:
    """Extract current company from Apify element"""
    current_positions = element.get('currentPosition', [])
    if current_positions and len(current_positions) > 0:
        return current_positions[0].get('companyName', '')
    
    # Fallback to first experience entry
    experience = element.get('experience', [])
    if experience and len(experience) > 0:
        first_exp = experience[0]
        if first_exp.get('endDate', {}).get('text') == 'Present':
            return first_exp.get('companyName', '')
    
    return ''

def _extract_current_position(element: Dict[str, Any]) -> str:
    """Extract current position from Apify element"""
    # Try to get from experience where endDate is Present
    experience = element.get('experience', [])
    if experience and len(experience) > 0:
        first_exp = experience[0]
        if first_exp.get('endDate', {}).get('text') == 'Present':
            return first_exp.get('position', '')
    
    return ''

def _extract_experience(element: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract experience data from Apify element"""
    experience_list = []
    experience = element.get('experience', [])
    
    for exp in experience:
        exp_data = {
            "position": exp.get('position', ''),
            "company": exp.get('companyName', ''),
            "company_linkedin_url": exp.get('companyLinkedinUrl', ''),
            "location": exp.get('location', ''),
            "employment_type": exp.get('employmentType', ''),
            "workplace_type": exp.get('workplaceType', ''),
            "duration": exp.get('duration', ''),
            "description": exp.get('description', ''),
            "skills": exp.get('skills', []),
            "start_date": _format_date(exp.get('startDate', {})),
            "end_date": _format_date(exp.get('endDate', {})),
            "is_current": exp.get('endDate', {}).get('text') == 'Present'
        }
        experience_list.append(exp_data)
    
    return experience_list

def _extract_education(element: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract education data from Apify element"""
    education_list = []
    education = element.get('education', [])
    
    for edu in education:
        edu_data = {
            "institution": edu.get('schoolName', ''),
            "school_linkedin_url": edu.get('schoolLinkedinUrl', ''),
            "degree": edu.get('degree', ''),
            "field_of_study": edu.get('fieldOfStudy', ''),
            "skills": edu.get('skills', []),
            "start_date": _format_date(edu.get('startDate', {})),
            "end_date": _format_date(edu.get('endDate', {})),
            "period": edu.get('period', '')
        }
        education_list.append(edu_data)
    
    return education_list

def _extract_skills(element: Dict[str, Any]) -> List[str]:
    """Extract skills from Apify element"""
    skills_list = []
    skills = element.get('skills', [])
    
    for skill in skills:
        if isinstance(skill, dict):
            skill_name = skill.get('name', '')
            if skill_name:
                skills_list.append(skill_name)
        elif isinstance(skill, str):
            skills_list.append(skill)
    
    # Also extract top skills if available
    top_skills = element.get('topSkills', '')
    if top_skills:
        # Split by common delimiters
        for delimiter in [' • ', ', ', ' | ']:
            if delimiter in top_skills:
                additional_skills = [s.strip() for s in top_skills.split(delimiter)]
                skills_list.extend(additional_skills)
                break
        else:
            skills_list.append(top_skills)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_skills = []
    for skill in skills_list:
        if skill and skill not in seen:
            seen.add(skill)
            unique_skills.append(skill)
    
    return unique_skills

def _format_date(date_obj: Dict[str, Any]) -> str:
    """Format date object from Apify to string"""
    if not date_obj:
        return ''
    
    # Try to get formatted text first
    text = date_obj.get('text', '')
    if text:
        return text
    
    # Fallback to constructing from year/month
    year = date_obj.get('year')
    month = date_obj.get('month')
    
    if year:
        if month:
            return f"{month} {year}"
        else:
            return str(year)
    
    return ''

def extract_batch_apify_profiles(apify_results: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Extract profile data from multiple Apify results in batch
    
    Args:
        apify_results: List of Apify JSON responses
        
    Returns:
        Dictionary mapping LinkedIn URLs to their extracted profile data
    """
    results = {}
    
    for result in apify_results:
        try:
            # Extract LinkedIn URL from the result
            linkedin_url = result.get('element', {}).get('linkedinUrl', '')
            if not linkedin_url:
                # Try to get from query
                linkedin_url = result.get('query', {}).get('query', '')
            
            if linkedin_url:
                extracted_data = extract_apify_profile_data(result)
                if extracted_data:
                    results[linkedin_url] = extracted_data
                else:
                    print(f"Warning: Failed to extract data for {linkedin_url}")
                    results[linkedin_url] = None
            else:
                print(f"Warning: No LinkedIn URL found in result: {result}")
                
        except Exception as e:
            print(f"Error processing Apify result: {str(e)}")
            continue
    
    return results

def print_apify_extraction_results(data: Dict[str, Any]):
    """Print Apify extraction results in a formatted way"""
    print("=" * 80)
    print("APIFY LINKEDIN PROFILE EXTRACTION RESULTS")
    print("=" * 80)
    
    # Basic Information
    print(f"Name: {data['first_name']} {data['last_name']}")
    print(f"Headline: {data['headline']}")
    print(f"Location: {data['location']}")
    print(f"LinkedIn URL: {data['linkedin_url']}")
    print(f"Current Company: {data['company']}")
    print(f"Current Position: {data['position']}")
    print(f"Connections: {data['connections_count']:,}")
    print(f"Followers: {data['followers_count']:,}")
    print(f"Premium: {data['premium']}")
    print(f"Verified: {data['verified']}")
    
    print("\n" + "-" * 40)
    print("ABOUT SECTION:")
    print("-" * 40)
    print(data['about_section'])
    
    print("\n" + "-" * 40)
    print("EXPERIENCE:")
    print("-" * 40)
    for i, exp in enumerate(data['experience_json'], 1):
        print(f"{i}. {exp.get('position', 'N/A')} at {exp.get('company', 'N/A')}")
        print(f"   Duration: {exp.get('start_date', 'N/A')} - {exp.get('end_date', 'N/A')}")
        print(f"   Location: {exp.get('location', 'N/A')}")
        print(f"   Type: {exp.get('employment_type', 'N/A')}")
        if exp.get('description'):
            print(f"   Description: {exp.get('description', 'N/A')[:100]}...")
        print()
    
    print("-" * 40)
    print("EDUCATION:")
    print("-" * 40)
    for i, edu in enumerate(data['education_json'], 1):
        print(f"{i}. {edu.get('institution', 'N/A')}")
        print(f"   Degree: {edu.get('degree', 'N/A')}")
        print(f"   Field: {edu.get('field_of_study', 'N/A')}")
        print(f"   Period: {edu.get('period', 'N/A')}")
        print()
    
    print("-" * 40)
    print("SKILLS:")
    print("-" * 40)
    skills = data['skills']
    if skills:
        for i in range(0, len(skills), 5):
            print(", ".join(skills[i:i+5]))
    else:
        print("No skills found")
    
    print("\n" + "-" * 40)
    print("METADATA:")
    print("-" * 40)
    print(f"Source: {data['source']}")
    print(f"Extraction Date: {data['extraction_date']}")
    print(f"Apify Profile ID: {data['apify_profile_id']}")
    print(f"Public Identifier: {data['public_identifier']}")

# Test function
if __name__ == "__main__":
    # Sample Apify response (from your terminal output)
    sample_apify_response = {
        'element': {
            'id': 'ACoAAA8BYqEBCGLg_vT_ca6mMEqkpp9nVffJ3hc',
            'publicIdentifier': 'williamhgates',
            'linkedinUrl': 'https://www.linkedin.com/in/williamhgates',
            'firstName': 'Bill',
            'lastName': 'Gates',
            'headline': 'Chair, Gates Foundation and Founder, Breakthrough Energy',
            'about': 'Chair of the Gates Foundation. Founder of Breakthrough Energy. Co-founder of Microsoft. Voracious reader. Avid traveler. Active blogger.',
            'openToWork': False,
            'hiring': False,
            'premium': True,
            'influencer': True,
            'location': {
                'linkedinText': 'Seattle, Washington, United States',
                'countryCode': 'US',
                'parsed': {
                    'text': 'Seattle, WA, United States',
                    'countryCode': 'US',
                    'country': 'United States',
                    'state': 'Washington',
                    'city': 'Seattle'
                }
            },
            'verified': False,
            'topSkills': 'Technology • Leadership',
            'connectionsCount': 8,
            'followerCount': 38600979,
            'currentPosition': [{'companyName': 'Gates Foundation'}],
            'experience': [
                {
                    'position': 'Co-chair',
                    'companyName': 'Gates Foundation',
                    'duration': '25 yrs 8 mos',
                    'startDate': {'year': 2000, 'text': '2000'},
                    'endDate': {'text': 'Present'}
                },
                {
                    'position': 'Founder',
                    'companyName': 'Breakthrough Energy',
                    'duration': '10 yrs 8 mos',
                    'startDate': {'year': 2015, 'text': '2015'},
                    'endDate': {'text': 'Present'}
                }
            ],
            'education': [
                {
                    'schoolName': 'Harvard University',
                    'startDate': {'year': 1973, 'text': '1973'},
                    'endDate': {'year': 1975, 'text': '1975'},
                    'period': '1973 - 1975'
                }
            ]
        }
    }
    
    try:
        extracted_data = extract_apify_profile_data(sample_apify_response)
        if extracted_data:
            print_apify_extraction_results(extracted_data)
            
            # Save as JSON
            with open('apify_extracted_profile_data.json', 'w') as f:
                json.dump(extracted_data, f, indent=2)
            
            print(f"\n\nExtracted data saved to 'apify_extracted_profile_data.json'")
        else:
            print("Failed to extract data")
            
    except Exception as e:
        print(f"Error: {e}")
