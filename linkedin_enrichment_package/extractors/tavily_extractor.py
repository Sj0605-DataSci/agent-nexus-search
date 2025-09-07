"""
Tavily data extractor for LinkedIn profiles
Handles markdown content and extracts structured data using improved extraction logic
"""
import re
import html
from typing import Dict, Any, List, Optional
from ..models import ProfileData
from ..exceptions import ExtractionError

class TavilyExtractor:
    """Extracts structured data from Tavily markdown responses using improved extraction logic"""
    
    @staticmethod
    def extract_profile_data(tavily_content: str, linkedin_url: str = "") -> ProfileData:
        """
        Extract ProfileData from Tavily markdown content using improved extraction logic
        
        Args:
            tavily_content: Markdown content from Tavily
            linkedin_url: LinkedIn URL for the profile
            
        Returns:
            ProfileData: Structured profile data
            
        Raises:
            ExtractionError: If extraction fails
        """
        try:
            # Clean and normalize the content
            content = TavilyExtractor._clean_content(tavily_content)
            
            # Use improved extraction methods
            extracted_data = TavilyExtractor._extract_structured_data(content)
            
            # Create ProfileData object with extracted data
            profile_data = ProfileData(
                first_name=extracted_data.get('first_name', ''),
                last_name=extracted_data.get('last_name', ''),
                full_name=extracted_data.get('name', ''),
                headline=extracted_data.get('headline', ''),
                linkedin_url=linkedin_url,
                email=extracted_data.get('email', ''),
                location=extracted_data.get('location', ''),
                current_company=extracted_data.get('current_company', ''),
                current_position=extracted_data.get('current_position', ''),
                about_section=extracted_data.get('about', ''),
                connections_count=extracted_data.get('connections_count', 0),
                followers_count=extracted_data.get('followers_count', 0),
                experience=extracted_data.get('experience', []),
                education=extracted_data.get('education', []),
                skills=extracted_data.get('skills', []),
                source="tavily",
                raw_data={"content": content}
            )
            
            return profile_data
            
        except Exception as e:
            raise ExtractionError(f"Failed to extract Tavily profile data: {str(e)}")
    
    @staticmethod
    def _clean_content(content: str) -> str:
        """Clean and normalize markdown content"""
        if not content:
            return ""
        
        # Decode HTML entities
        content = html.unescape(content)
        
        # Remove excessive whitespace
        content = re.sub(r'\n\s*\n', '\n\n', content)
        content = re.sub(r' +', ' ', content)
        
        # Clean up markdown formatting while preserving structure
        content = re.sub(r'\*\*(.*?)\*\*', r'\1', content)  # Bold
        content = re.sub(r'\*(.*?)\*', r'\1', content)      # Italic
        content = re.sub(r'`(.*?)`', r'\1', content)        # Code
        
        return content.strip()

    @staticmethod
    def _extract_structured_data(content: str) -> Dict[str, Any]:
        """
        Extract structured data from markdown content using improved logic
        """
        data = {}
        
        # Split content into sections
        sections = TavilyExtractor._split_into_sections(content)
        
        # Extract basic info
        data.update(TavilyExtractor._extract_basic_info(content))
        
        # Extract experience section
        if 'experience' in sections:
            data['experience'] = TavilyExtractor._extract_experience_section(sections['experience'])
        else:
            data['experience'] = TavilyExtractor._extract_experience_fallback(content)
        
        # Extract education section
        if 'education' in sections:
            data['education'] = TavilyExtractor._extract_education_section(sections['education'])
        else:
            data['education'] = TavilyExtractor._extract_education_fallback(content)
        
        # Extract skills
        data['skills'] = TavilyExtractor._extract_skills_improved(content)
        
        # Extract current position from experience or content
        if data.get('experience'):
            first_exp = data['experience'][0] if data['experience'] else {}
            data['current_company'] = first_exp.get('company', '')
            data['current_position'] = first_exp.get('title', '')
        else:
            data['current_company'], data['current_position'] = TavilyExtractor._extract_current_position_fallback(content)
        
        return data

    @staticmethod
    def _split_into_sections(content: str) -> Dict[str, str]:
        """Split content into major sections based on headers"""
        sections = {}
        current_section = None
        current_content = []
        
        lines = content.split('\n')
        
        for line in lines:
            # Check for section headers
            if re.match(r'^#{1,3}\s*(experience|education|about|skills|summary)', line.lower()):
                # Save previous section
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                
                # Start new section
                current_section = re.sub(r'^#{1,3}\s*', '', line.lower()).strip()
                current_content = []
            elif current_section:
                current_content.append(line)
        
        # Save last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return sections

    @staticmethod
    def _extract_basic_info(content: str) -> Dict[str, Any]:
        """Extract basic profile information"""
        data = {}
        
        # Extract name (multiple patterns)
        name_patterns = [
            r'^#\s*([A-Z][a-z]+ [A-Z][a-z]+)',
            r'Name:\s*([A-Z][a-z]+ [A-Z][a-z]+)',
            r'^([A-Z][a-z]+ [A-Z][a-z]+)\s*\n',
            r'Profile of ([A-Z][a-z]+ [A-Z][a-z]+)'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, content, re.MULTILINE)
            if match:
                full_name = match.group(1).strip()
                data['name'] = full_name
                name_parts = full_name.split()
                if len(name_parts) >= 2:
                    data['first_name'] = name_parts[0]
                    data['last_name'] = ' '.join(name_parts[1:])
                break

    @staticmethod
    def _extract_experience_section(experience_content: str) -> List[Dict[str, Any]]:
        """Extract experience from dedicated experience section"""
        experiences = []
        
        # Split by job entries (look for patterns like company names or dates)
        job_blocks = re.split(r'\n(?=\w+.*(?:Inc|LLC|Corp|Company|Ltd|Technologies|Solutions))', experience_content)
        
        for block in job_blocks:
            if not block.strip():
                continue
                
            exp_data = TavilyExtractor._parse_experience_block(block)
            if exp_data:
                experiences.append(exp_data)
        
        return experiences
    
    @staticmethod
    def _extract_experience_fallback(content: str) -> List[Dict[str, Any]]:
        """Fallback experience extraction from full content"""
        experiences = []
        
        # Look for experience patterns in full content
        exp_patterns = [
            r'(\w+.*(?:Inc|LLC|Corp|Company|Ltd|Technologies|Solutions))\s*\n([^\n]+)\s*\n([^\n]*(?:20\d{2}|Present))',
            r'([A-Z][^\n]+)\s*at\s*(\w+.*(?:Inc|LLC|Corp|Company|Ltd))\s*\(([^)]+)\)',
        ]
        
        for pattern in exp_patterns:
            matches = re.finditer(pattern, content, re.MULTILINE)
            for match in matches:
                exp_data = {
                    'company': match.group(2) if len(match.groups()) > 1 else match.group(1),
                    'title': match.group(1) if len(match.groups()) > 1 else '',
                    'duration': match.group(3) if len(match.groups()) > 2 else '',
                    'description': ''
                }
                experiences.append(exp_data)
        
        return experiences
    
    @staticmethod
    def _parse_experience_block(block: str) -> Optional[Dict[str, Any]]:
        """Parse individual experience block"""
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        if not lines:
            return None
        
        exp_data = {'company': '', 'title': '', 'duration': '', 'description': ''}
        
        # First line is usually company or title
        exp_data['company'] = lines[0]
        
        # Look for title and duration in subsequent lines
        for line in lines[1:]:
            if re.search(r'20\d{2}|Present', line):
                exp_data['duration'] = line
            elif not exp_data['title'] and line:
                exp_data['title'] = line
            else:
                exp_data['description'] += line + ' '
        
        exp_data['description'] = exp_data['description'].strip()
        return exp_data
    
    @staticmethod
    def _extract_education_section(education_content: str) -> List[Dict[str, Any]]:
        """Extract education from dedicated education section"""
        education_list = []
        
        # Split by education entries
        edu_blocks = re.split(r'\n(?=\w+.*(?:University|College|School|Institute))', education_content)
        
        for block in edu_blocks:
            if not block.strip():
                continue
                
            edu_data = TavilyExtractor._parse_education_block(block)
            if edu_data:
                education_list.append(edu_data)
        
        return education_list
    
    @staticmethod
    def _extract_education_fallback(content: str) -> List[Dict[str, Any]]:
        """Fallback education extraction from full content"""
        education_list = []
        
        # Look for education patterns
        edu_patterns = [
            r'(\w+.*(?:University|College|School|Institute))\s*\n([^\n]+)\s*\n([^\n]*(?:20\d{2}|Present))',
            r'([A-Z][^\n]+)\s*at\s*(\w+.*(?:University|College|School))\s*\(([^)]+)\)',
        ]
        
        for pattern in edu_patterns:
            matches = re.finditer(pattern, content, re.MULTILINE)
            for match in matches:
                edu_data = {
                    'institution': match.group(2) if len(match.groups()) > 1 else match.group(1),
                    'degree': match.group(1) if len(match.groups()) > 1 else '',
                    'duration': match.group(3) if len(match.groups()) > 2 else '',
                    'field_of_study': ''
                }
                education_list.append(edu_data)
        
        return education_list
    
    @staticmethod
    def _parse_education_block(block: str) -> Optional[Dict[str, Any]]:
        """Parse individual education block"""
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        if not lines:
            return None
        
        edu_data = {'institution': '', 'degree': '', 'duration': '', 'field_of_study': ''}
        
        # First line is usually institution
        edu_data['institution'] = lines[0]
        
        # Look for degree and duration in subsequent lines
        for line in lines[1:]:
            if re.search(r'20\d{2}|Present', line):
                edu_data['duration'] = line
            elif not edu_data['degree'] and line:
                edu_data['degree'] = line
            else:
                edu_data['field_of_study'] += line + ' '
        
        edu_data['field_of_study'] = edu_data['field_of_study'].strip()
        return edu_data
    
    @staticmethod
    def _extract_skills_improved(content: str) -> List[str]:
        """Extract skills using improved patterns"""
        skills = []
        
        # Look for skills sections
        skills_patterns = [
            r'Skills?:\s*(.+?)(?:\n\n|\n[A-Z])',
            r'Expertise:\s*(.+?)(?:\n\n|\n[A-Z])',
            r'Technologies:\s*(.+?)(?:\n\n|\n[A-Z])',
        ]
        
        for pattern in skills_patterns:
            match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
            if match:
                skills_text = match.group(1)
                # Split by common delimiters
                skill_list = re.split(r'[,•·\n]', skills_text)
                skills.extend([skill.strip() for skill in skill_list if skill.strip()])
        
        return list(set(skills))  # Remove duplicates
    
    @staticmethod
    def _extract_current_position_fallback(content: str) -> tuple[str, str]:
        """Extract current company and position"""
        patterns = [
            r'Current:\s*(.+?)\s+at\s+(.+?)(?:\n|$)',
            r'Currently:\s*(.+?)\s+at\s+(.+?)(?:\n|$)',
            r'Works at:\s*(.+?)(?:\n|$)',
            r'Company:\s*(.+?)(?:\n|$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                if len(match.groups()) == 2:
                    return match.group(2).strip(), match.group(1).strip()
                else:
                    return match.group(1).strip(), ""
        
        return "", ""
    
    @staticmethod
    def _extract_connections_count(content: str) -> int:
        """Extract connections count"""
        patterns = [
            r'(\d+(?:,\d+)*)\s+connections',
            r'Connections:\s*(\d+(?:,\d+)*)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                count_str = match.group(1).replace(',', '')
                try:
                    return int(count_str)
                except ValueError:
                    continue
        
        return 0
    
    @staticmethod
    def _extract_followers_count(content: str) -> int:
        """Extract followers count"""
        patterns = [
            r'(\d+(?:,\d+)*)\s+followers',
            r'Followers:\s*(\d+(?:,\d+)*)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                count_str = match.group(1).replace(',', '')
                try:
                    return int(count_str)
                except ValueError:
                    continue
        
        return 0
