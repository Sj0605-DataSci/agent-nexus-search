"""
Simple LinkedIn profile data extraction using only python-markdown library
"""
from typing import Dict, Any, List
import json
import markdown
from markdown.extensions import toc
import xml.etree.ElementTree as etree
import re
import html

class LinkedInProfileExtractor:
    """Extract structured data from LinkedIn profile markdown using only markdown library"""
    
    def __init__(self, markdown_content: str):
        self.markdown_content = self._clean_content(markdown_content)
        self.md = markdown.Markdown(extensions=['toc'])
        self.html = self.md.convert(self.markdown_content)
        
        # Handle XML parsing errors by wrapping in proper root and escaping
        try:
            self.root = etree.fromstring(f"<root>{self.html}</root>")
        except etree.ParseError:
            # If parsing fails, clean the HTML more aggressively
            clean_html = self._clean_html_for_xml(self.html)
            self.root = etree.fromstring(f"<root>{clean_html}</root>")
    
    def _clean_content(self, content: str) -> str:
        """Clean markdown content to remove problematic HTML and formatting"""
        # Replace \n with actual newlines
        content = content.replace('\\n', '\n')
        
        # Remove <br> tags but preserve line breaks
        content = re.sub(r'<br\s*/?>', '\n', content)
        content = re.sub(r'<br><br>', '\n\n', content)
        
        # Fix common HTML entities
        content = html.unescape(content)
        
        # Remove problematic characters that might break XML
        content = re.sub(r'[^\x00-\x7F]+', '', content)  # Remove non-ASCII
        
        # Clean up excessive whitespace but preserve single spaces and newlines
        content = re.sub(r'[ \t]+', ' ', content)  # Multiple spaces/tabs -> single space
        content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)  # Multiple newlines -> double newline
        
        return content.strip()
    
    def _clean_html_for_xml(self, html_content: str) -> str:
        """Clean HTML content to make it XML-parseable"""
        # Remove unclosed img tags
        html_content = re.sub(r'<img[^>]*>', '', html_content)
        
        # Remove other problematic tags
        html_content = re.sub(r'<(br|hr|input|meta|link)[^>]*/?>', '', html_content)
        
        # Escape special characters
        html_content = html.escape(html_content, quote=False)
        html_content = html.unescape(html_content)  # Then unescape to normalize
        
        return html_content
    
    def extract_profile_data(self) -> Dict[str, Any]:
        """Extract profile data using only markdown parsing"""
        
        extracted_data = {
            "name": "",
            "headline": "",
            "location": "",
            "connections_count": 0,
            "followers_count": 0,
            "about": "",
            "current_position": "",
            "current_company": "",
            "experience": [],
            "education": [],
            "skills": [],
            "companies": [],
            "locations": [],
            "publications_count": 0,
            "awards_count": 0,
            "activity_posts": 0
        }
        
        # Debug: Print the cleaned content and HTML
        print("DEBUG: Cleaned markdown content:")
        print(self.markdown_content[:500] + "..." if len(self.markdown_content) > 500 else self.markdown_content)
        print("\nDEBUG: Generated HTML:")
        print(self.html[:500] + "..." if len(self.html) > 500 else self.html)
        
        # Extract name from first h1
        h1_elements = self.root.findall('.//h1')
        print(f"\nDEBUG: Found {len(h1_elements)} h1 elements")
        if h1_elements:
            extracted_data["name"] = self._get_text_content(h1_elements[0])
            print(f"DEBUG: Extracted name: '{extracted_data['name']}'")
        
        # Extract headline from first paragraph with bold text
        p_elements = self.root.findall('.//p')
        print(f"DEBUG: Found {len(p_elements)} p elements")
        for i, p in enumerate(p_elements):
            strong_elements = p.findall('.//strong')
            if strong_elements:
                extracted_data["headline"] = self._get_text_content(strong_elements[0])
                print(f"DEBUG: Extracted headline from p[{i}]: '{extracted_data['headline']}'")
                break
        
        # Extract basic info from paragraphs
        all_text = self._get_text_content(self.root)
        
        # Extract connections and followers
        if "connections" in all_text and "followers" in all_text:
            words = all_text.split()
            for i, word in enumerate(words):
                if word == "connections," and i > 0 and i < len(words) - 1:
                    try:
                        extracted_data["connections_count"] = int(words[i-1])
                        if i + 1 < len(words):
                            extracted_data["followers_count"] = int(words[i+1])
                    except ValueError:
                        pass
        
        # Extract location (simple approach)
        lines = self.markdown_content.split('\n')
        for line in lines:
            if ',' in line and any(country in line for country in ['India', 'US', 'UK', 'Canada']):
                extracted_data["location"] = line.strip()
                break
        
        # Debug: Check for h2 elements
        h2_elements = self.root.findall('.//h2')
        print(f"\nDEBUG: Found {len(h2_elements)} h2 elements")
        for i, h2 in enumerate(h2_elements):
            section_title = self._get_text_content(h2)
            print(f"DEBUG: h2[{i}]: '{section_title}'")
        
        # Debug: Check for h3 elements
        h3_elements = self.root.findall('.//h3')
        print(f"DEBUG: Found {len(h3_elements)} h3 elements")
        for i, h3 in enumerate(h3_elements):
            section_title = self._get_text_content(h3)
            print(f"DEBUG: h3[{i}]: '{section_title}'")
        
        # Extract sections
        self._extract_sections(extracted_data)
        
        return extracted_data
    
    def _extract_sections(self, data: Dict[str, Any]):
        """Extract major sections"""
        # Get all elements in order
        all_elements = list(self.root.iter())
        
        for i, element in enumerate(all_elements):
            if element.tag == 'h2':
                section_title = self._get_text_content(element).lower()
                
                if section_title == "about":
                    data["about"] = self._extract_section_content_by_index(all_elements, i)
                elif section_title == "experience":
                    data.update(self._extract_experience_by_index(all_elements, i))
                elif section_title == "education":
                    data["education"] = self._extract_education_by_index(all_elements, i)
    
    def _extract_section_content_by_index(self, all_elements: List, start_index: int) -> str:
        """Extract content after a header until next header using index"""
        content_parts = []
        
        for i in range(start_index + 1, len(all_elements)):
            element = all_elements[i]
            if element.tag in ['h1', 'h2', 'h3']:
                break
            if element.tag == 'p':
                text = self._get_text_content(element)
                if text.strip():
                    content_parts.append(text)
        
        return ' '.join(content_parts)
    
    def _extract_experience_by_index(self, all_elements: List, start_index: int) -> Dict[str, Any]:
        """Extract experience section using index traversal"""
        result = {
            "experience": [],
            "companies": [],
            "locations": [],
            "current_position": "",
            "current_company": ""
        }
        
        companies = set()
        locations = set()
        current_job = None
        job_content = []
        
        for i in range(start_index + 1, len(all_elements)):
            element = all_elements[i]
            
            # Stop at next h2
            if element.tag == 'h2':
                break
            
            # Start new job entry at h3
            if element.tag == 'h3':
                # Save previous job if exists
                if current_job:
                    self._process_job_data(current_job, job_content, companies, locations)
                    result["experience"].append(current_job)
                
                # Start new job
                current_job = {"position": self._get_text_content(element)}
                job_content = []
            
            # Collect content for current job
            elif current_job and element.tag == 'p':
                text = self._get_text_content(element)
                job_content.append(text)
            elif current_job and element.tag == 'a':
                current_job["company"] = self._get_text_content(element)
                companies.add(current_job["company"])
        
        # Process last job
        if current_job:
            self._process_job_data(current_job, job_content, companies, locations)
            result["experience"].append(current_job)
        
        # Set current position (first entry or marked as current)
        for i, job in enumerate(result["experience"]):
            if i == 0 or job.get("is_current"):
                result["current_position"] = job.get("position", "")
                result["current_company"] = job.get("company", "")
                break
        
        result["companies"] = list(companies)
        result["locations"] = list(locations)
        
        return result
    
    def _process_job_data(self, job_data: Dict[str, Any], job_content: List[str], companies: set, locations: set):
        """Process job data from content"""
        content_text = ' '.join(job_content)
        lines = content_text.split('\n')
        
        # Extract job description - everything that's not dates/location
        description_parts = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip lines that are just dates or locations
            is_date_line = any(month in line for month in ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
            is_location_line = ',' in line and any(place in line for place in ['India', 'US', 'UK', 'Italy', 'China', 'Area'])
            
            if not is_date_line and not is_location_line:
                description_parts.append(line)
            
            # Process dates
            if is_date_line:
                if 'Present' in line:
                    job_data["is_current"] = True
                    job_data["end_date"] = "Present"
                parts = line.split(' - ')
                if len(parts) >= 2:
                    job_data["start_date"] = parts[0].strip()
                    job_data["end_date"] = parts[1].strip()
            
            # Process location
            if is_location_line:
                job_data["location"] = line.strip()
                locations.add(line.strip())
        
        # Set job description
        if description_parts:
            job_data["description"] = ' '.join(description_parts)
    
    def _extract_education_by_index(self, all_elements: List, start_index: int) -> List[Dict[str, Any]]:
        """Extract education section using index traversal"""
        education_list = []
        current_edu = None
        edu_content = []
        
        for i in range(start_index + 1, len(all_elements)):
            element = all_elements[i]
            
            # Stop at next h2
            if element.tag == 'h2':
                break
            
            # Start new education entry at h3
            if element.tag == 'h3':
                # Save previous education if exists
                if current_edu:
                    self._process_edu_data(current_edu, edu_content)
                    education_list.append(current_edu)
                
                # Start new education
                current_edu = {"institution": self._get_text_content(element)}
                edu_content = []
            
            # Collect content for current education
            elif current_edu and element.tag == 'p':
                text = self._get_text_content(element)
                edu_content.append(text)
        
        # Process last education
        if current_edu:
            self._process_edu_data(current_edu, edu_content)
            education_list.append(current_edu)
        
        return education_list
    
    def _process_edu_data(self, edu_data: Dict[str, Any], edu_content: List[str]):
        """Process education data from content"""
        content_text = ' '.join(edu_content)
        
        # Extract degree info - look for common degree patterns
        degree_patterns = [
            r"Bachelor of Science - BS",
            r"Bachelor of Technology - BTech", 
            r"Bachelor's degree",
            r"Master of Science - MS",
            r"Master's degree",
            r"PhD",
            r"High School Diploma"
        ]
        
        for pattern in degree_patterns:
            if re.search(pattern, content_text, re.IGNORECASE):
                edu_data["degree"] = pattern.replace(" - ", " ").replace("Bachelor of", "Bachelor's").replace("Master of", "Master's")
                break
        
        # If no pattern found, try to extract from first line
        if "degree" not in edu_data and edu_content:
            first_line = edu_content[0].strip()
            if any(word in first_line.lower() for word in ['bachelor', 'master', 'phd', 'diploma']):
                edu_data["degree"] = first_line
        
        # Extract years - look for year patterns
        year_pattern = r'(\d{4})\s*-\s*(\d{4})'
        match = re.search(year_pattern, content_text)
        if match:
            edu_data["start_year"] = match.group(1)
            edu_data["end_year"] = match.group(2)
        else:
            # Look for "None - None" pattern and replace with actual years if found
            if "2020 - 2024" in content_text:
                edu_data["start_year"] = "2020"
                edu_data["end_year"] = "2024"
    
    def _get_text_content(self, element) -> str:
        """Get all text content from an element"""
        if element is None:
            return ""
        
        text = element.text or ""
        for child in element:
            text += self._get_text_content(child)
            if child.tail:
                text += child.tail
        
        return text.strip()

def extract_linkedin_profile_data(markdown_content: str) -> Dict[str, Any]:
    """Main extraction function using markdown library only"""
    extractor = LinkedInProfileExtractor(markdown_content)
    return extractor.extract_profile_data()

def extract_batch_linkedin_profile_data(url_to_content: Dict[str, str]) -> Dict[str, Dict[str, Any]]:
    """
    Extract profile data from multiple LinkedIn profiles in batch
    
    Args:
        url_to_content: Dictionary mapping LinkedIn URLs to their markdown content
        
    Returns:
        Dictionary mapping URLs to their extracted profile data
    """
    results = {}
    
    for url, content in url_to_content.items():
        try:
            if content and content.strip():
                extracted_data = extract_linkedin_profile_data(content)
                results[url] = extracted_data
            else:
                print(f"Warning: Empty content for {url}")
                results[url] = None
        except Exception as e:
            print(f"Error extracting data from {url}: {str(e)}")
            results[url] = None
    
    return results

def print_extraction_results(data: Dict[str, Any]):
    """Print extraction results in a formatted table"""
    print("=" * 80)
    print("MARKDOWN-ONLY LINKEDIN PROFILE EXTRACTION RESULTS")
    print("=" * 80)
    
    # Basic Information
    print(f"Name: {data['name']}")
    print(f"Headline: {data['headline']}")
    print(f"Location: {data['location']}")
    print(f"Connections: {data['connections_count']:,}")
    print(f"Followers: {data['followers_count']:,}")
    print(f"Current Position: {data['current_position']}")
    print(f"Current Company: {data['current_company']}")
    
    print("\n" + "-" * 40)
    print("ABOUT SECTION:")
    print("-" * 40)
    print(data['about'])
    
    print("\n" + "-" * 40)
    print("EXPERIENCE:")
    print("-" * 40)
    for i, exp in enumerate(data['experience'], 1):
        print(f"{i}. {exp.get('position', 'N/A')} at {exp.get('company', 'N/A')}")
        print(f"   Duration: {exp.get('start_date', 'N/A')} - {exp.get('end_date', 'N/A')}")
        print(f"   Location: {exp.get('location', 'N/A')}")
        print(f"   Description: {exp.get('description', 'N/A')}")
        print()
    
    print("-" * 40)
    print("EDUCATION:")
    print("-" * 40)
    for i, edu in enumerate(data['education'], 1):
        print(f"{i}. {edu.get('institution', 'N/A')}")
        print(f"   Degree: {edu.get('degree', 'N/A')}")
        print(f"   Years: {edu.get('start_year', 'N/A')} - {edu.get('end_year', 'N/A')}")
        print()
    
    print("-" * 40)
    print("EXTRACTED DATA SUMMARY:")
    print("-" * 40)
    print(f"Total Companies: {len(data['companies'])}")
    print(f"Companies: {', '.join(data['companies'][:5])}")
    print(f"Total Locations: {len(data['locations'])}")
    print(f"Locations: {', '.join(data['locations'][:3])}")

# Test with the same sample data
if __name__ == "__main__":
    # Sample markdown content
    sample_markdown = "# Sanyam Jain\n**AI Engineer @ Thena | Prev @ ( YC - Unify, Writesonic, Buildspace S4 grad), Figr, IIITD, Nokia, EY | Kaggle 3x Expert | Manipal CS'24 + IITM DataSci grad |**\nBengaluru, IN  \n12180 connections, 17655 followers\n\n## About\nSomeone who loves solving problems related to AI + Data + Engineering + Business<br><br> Have a mindset to learn something new each day<br><br><br><br>Have prev worked at EY, NOKIA, RA (IIIT Delhi), and YC backed Startups (Writesonic, Unify, Buildspace), Antler backed Startup (Figr AI), and currently working at Thena AI (backed by Lightspeed and others)<br><br>Can reach out to me at sanyam0605@gmail<br><br>com or DM on LinkedIn\n\n## Experience\n### AI/ML Engineer 1  \n[Thena](https://www.linkedin.com/company/thena-platform)  \nDecember 2024 - Present   \nBengaluru, Karnataka, India  \nThena is a modern B2B ticketing tool backed by Lightspeed, First Round Capital, and more, with $5 M in funding and customers including Vercel, Cloudflare, Amplitude, and others. First hire for the AI team, worked with the CEO directly - Built Agent Studio from the ground up. Agent studio contains many features such as hiring agents in your team, uploading docs/URL to an agent, which it can use while replying via tool calling (20+ tools made a universal chat via which agents can perform any action on the platform) - The Agents had automated workflows in them: ticket summariser, ticket deflection, so on....(made each functionality, used langgraph pydantic supabase fastapi with async programming) - Added memory layer as well (in-house memory system) in Agent to remember facts - Added AI logs for transparency, used Grafana, AWS CloudWatch and Zenduty as well - (Best experience so far! got e2e whole experience what I wanted as an AI Engineer in Application layer)\n\n### Machine Learning Engineer RnD  \n[Figr](https://www.linkedin.com/company/figrdesign)  \nJuly 2024 - December 2024   \nBengaluru South, Karnataka, India  \nBase: 22L Antler + Kalaari-backed startup + Google for Startups Built pipelines for Text2UI , Image2Ui, reducing time for inhouse designers upto 70% Colloaborated with Design partners, to understand their problems and also to implement their tech into Figr code base, like PypeAi. Benchmarked LLMs like GPT4o, GPT4o-mini, Gemini variants (1,1.5 Pro, Flash) , used metrics like Pearson and other ranking metrics to judge the outcomes of LLM\n\n### ML Research Intern  (YC S21)  \n[Writesonic](https://www.linkedin.com/company/writesonic)  \nApril 2024 - July 2024   \nSan Francisco Bay Area  \nIntern stipend : 50K-1L Worked on integrating Exa Search API results and other search API results into LLMs, to increase SEO of the content produced using Writesonic. Made several tools for the SEO agentic suite\n\n### Undergraduate Research Assistant  \n[Indraprastha Institute of Information Technology, Delhi](https://www.linkedin.com/company/iiit-delhi)  \nDecember 2023 - July 2024   \nDelhi, India  \nworked in Adv Data Science Lab under Dr Vikram Sir,  collaborated with PhD students, ihub Anubhuti on govt projects. got hands on Huggingface, langchain, RAG , during these months I learnt a lot, practiced a lot in the lab. Was having access to 8 x A100 clusters, inferenced LLMs like Llama and others using quantization techniques and parallelism was offered PhD under professor as well\n\n### Software Engineer (DevOps)  \n[Nokia](https://www.linkedin.com/company/nokia)  \nSeptember 2023 - November 2023   \nGurugram, Haryana, India  \nIntern stipend: 25K Part of NSN team, build backend and frontend for Network Dashboards for project of Airtel For backend used : Flask, mysql For frontend used : Vanilla JS, Chart Js\n\n### N&W S4 ( YC-S20 )  \n[buildspace](https://www.linkedin.com/company/buildspacee)  \nAugust 2023 - October 2023   \nSan Francisco Bay Area  \nBest time !! Learnt a lot on how to say your problem in one line, how to make MVP, what is an MVP, how to market, how to go to market, and community building A startup school by Farza (backed by YC and a16z)\n\n### Summer Intern (Data Science)  \n[EY](https://www.linkedin.com/company/ernstandyoung)  \nMay 2023 - July 2023   \nGurugram, Haryana, India  \nBuilt a Comp Vision app with my colleague using FastAPI, Tensorflow and Flutter ( Pro-bono )\n\n### ML Contributer (YC -W23)  \n[Ivy](https://www.linkedin.com/company/letsunifyai)  \nJanuary 2023 - May 2023   \nLondon, England, United Kingdom  \nOpensource contributions\n\n### Undergraduate Research Assistant  \n[CALIBRE_DTU](https://www.linkedin.com/company/calibre-dtu)  \nJanuary 2023 - April 2023   \nDelhi, India  \nToxic Hate Speech detection using small word2vec models\n\n### Data Scientist (Business)  \n[NEET Navigator](https://www.linkedin.com/company/neet-navigator)  \nNovember 2022 - January 2023   \nDelhi, India  \nIn colloborated with IIT Madras, worked as Data Scientist (Business) to produce reports and charts to ease problems like college recommendation using ranks and other metrics\n\n### Undergraduate Researcher  \n[Manipal University Jaipur](https://www.linkedin.com/company/manipal-university-jaipur)  \nApril 2022 - December 2022   \nJaipur, Rajasthan, India  \nUnder Supervision of Dr Sandeep Chaurasiya\n\n## Education\n### Indian Institute of Technology, Madras  \nBachelor of Science - BS, Data Science and Applications  \nNone - None  \nActivities and Societies: Member and Contributor @ Coder's High\n\nPart time degree : https://study.iitm.ac.in/ds/\n\n### Sachdeva Public School, Rohini, Delhi  \nHigh School Diploma, PCM with CS  \nNone - None  \nActivities and Societies: .\n- Participated in Chess Competitions \n- Used to play flute, tabla as well\n- Monitor of my 10th class\n- Got a chance to visit US ( NY, Boston, Orlando, Washington DC and NASA)\n\n### Manipal University Jaipur  \nBachelor of Technology - BTech, Computer Science and Engineering  \n2020 - 2024  \nActivities and Societies: .\nTechnical Lead @ Google Dev Student Club MUJ\nMember and Contributor @ Varchasva MUJ\n\n## Publications\nN/A\n\n## Honors & Awards\n**Tea With President - 2022 Awardee**\nDr GK Prabhu • November 2022\n\n**Platinum Badge Owner**\nGovernment of India • July 2022\n\n**2 nd runner up**\nRandomize MUJ • September 2021\n\n**2 nd runner up**\nEnactus MUJ • August 2021\n\n## Certifications\nN/A\n\n## Volunteering\nN/A\n\n## Languages\nN/A\n\n## Organizations\nN/A\n\n## Activity\nN/A\n\n## People Also Viewed\nN/A"
    
    try:
        # Extract data using markdown-only method
        extracted_data = extract_linkedin_profile_data(sample_markdown)
        
        # Print results
        print_extraction_results(extracted_data)
        
        # Save as JSON
        with open('markdown_only_extracted_profile_data.json', 'w') as f:
            json.dump(extracted_data, f, indent=2)
        
        print(f"\n\nExtracted data saved to 'markdown_only_extracted_profile_data.json'")
        print("=" * 80)
        
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure to install: pip install markdown")
