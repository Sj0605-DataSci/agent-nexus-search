"""
Search API integrations for Agent Nexus Search
"""
import os
import asyncio
from typing import List, Dict, Any
import logging
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

class ExaSearch:
    """
    Integration with Exa API for web search and content retrieval
    """
    def __init__(self):
        self.api_key = os.getenv("EXA_API_KEY")
        self.base_url = "https://api.exa.ai"
        
        if not self.api_key:
            logger.warning("EXA_API_KEY not found in environment variables")
    
    async def search(self, query: str, num_results: int = 5, 
                     search_type: str = "auto", 
                     include_domains: List[str] = None,
                     exclude_domains: List[str] = None,
                     get_text: bool = True,
                     get_highlights: bool = True,
                     get_summary: bool = True) -> List[Dict[str, Any]]:
        """
        Perform a search using Exa API
        
        Args:
            query: The search query
            num_results: Number of results to return (default: 5)
            search_type: Type of search - "auto", "neural", or "keyword" (default: "auto")
            include_domains: List of domains to include in search results
            exclude_domains: List of domains to exclude from search results
            get_text: Whether to include full text in results (default: True)
            get_highlights: Whether to include highlights in results (default: True)
            get_summary: Whether to include summaries in results (default: True)
            
        Returns:
            List of search results with metadata
        """
        if not self.api_key:
            logger.error("EXA_API_KEY not set, cannot perform search")
            return []
        
        try:
            headers = {
                "x-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            
            # Build request payload
            payload = {
                "query": query,
                "numResults": num_results,
                "searchType": search_type,
                "text": get_text,
                "highlights": get_highlights,
                "summary": get_summary
            }
            
            # Add optional parameters if provided
            if include_domains:
                payload["includeDomains"] = include_domains
            if exclude_domains:
                payload["excludeDomains"] = exclude_domains
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/search",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    
                    # Format results for our application
                    formatted_results = []
                    for result in results:
                        formatted_result = {
                            "title": result.get("title", ""),
                            "content": result.get("text", ""),
                            "url": result.get("url", ""),
                            "source": result.get("url", ""),
                            "api": "exa",
                            "score": result.get("score", 0.0),
                            "query": query,
                            "summary": result.get("summary", ""),
                            "highlights": result.get("highlights", []),
                            "published_date": result.get("publishedDate", ""),
                            "author": result.get("author", ""),
                            "image": result.get("image", "")
                        }
                        formatted_results.append(formatted_result)
                    
                    return formatted_results
                else:
                    logger.error(f"Exa search API error: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error in Exa search: {str(e)}")
            return []
    
    async def get_contents(self, urls: List[str], 
                          get_text: bool = True,
                          get_highlights: bool = False,
                          get_summary: bool = True) -> List[Dict[str, Any]]:
        """
        Get contents from a list of URLs
        
        Args:
            urls: List of URLs to get contents for
            get_text: Whether to include full text in results (default: True)
            get_highlights: Whether to include highlights in results (default: False)
            get_summary: Whether to include summaries in results (default: True)
            
        Returns:
            List of content results with metadata
        """
        if not self.api_key:
            logger.error("EXA_API_KEY not set, cannot get contents")
            return []
        
        try:
            headers = {
                "x-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            
            # Build request payload
            payload = {
                "urls": urls,
                "text": get_text,
                "highlights": get_highlights,
                "summary": get_summary
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/contents",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    
                    # Format results for our application
                    formatted_results = []
                    for result in results:
                        formatted_result = {
                            "title": result.get("title", ""),
                            "content": result.get("text", ""),
                            "url": result.get("url", ""),
                            "source": result.get("url", ""),
                            "api": "exa_contents",
                            "summary": result.get("summary", ""),
                            "published_date": result.get("publishedDate", ""),
                            "author": result.get("author", ""),
                            "image": result.get("image", "")
                        }
                        formatted_results.append(formatted_result)
                    
                    return formatted_results
                else:
                    logger.error(f"Exa contents API error: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error in Exa get_contents: {str(e)}")
            return []
    
    async def find_similar(self, url: str, num_results: int = 5,
                          get_text: bool = True,
                          get_highlights: bool = False,
                          get_summary: bool = True) -> List[Dict[str, Any]]:
        """
        Find similar links to a given URL
        
        Args:
            url: The URL to find similar links for
            num_results: Number of results to return (default: 5)
            get_text: Whether to include full text in results (default: True)
            get_highlights: Whether to include highlights in results (default: False)
            get_summary: Whether to include summaries in results (default: True)
            
        Returns:
            List of similar links with metadata
        """
        if not self.api_key:
            logger.error("EXA_API_KEY not set, cannot find similar links")
            return []
        
        try:
            headers = {
                "x-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            
            # Build request payload
            payload = {
                "url": url,
                "numResults": num_results,
                "text": get_text,
                "highlights": get_highlights,
                "summary": get_summary
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/findSimilar",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    
                    # Format results for our application
                    formatted_results = []
                    for result in results:
                        formatted_result = {
                            "title": result.get("title", ""),
                            "content": result.get("text", ""),
                            "url": result.get("url", ""),
                            "source": result.get("url", ""),
                            "api": "exa_similar",
                            "score": result.get("score", 0.0),
                            "summary": result.get("summary", ""),
                            "highlights": result.get("highlights", []),
                            "published_date": result.get("publishedDate", ""),
                            "author": result.get("author", ""),
                            "image": result.get("image", "")
                        }
                        formatted_results.append(formatted_result)
                    
                    return formatted_results
                else:
                    logger.error(f"Exa find similar API error: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error in Exa find_similar: {str(e)}")
            return []
    
    async def get_answer(self, query: str, stream: bool = False,
                        num_results: int = 5,
                        search_type: str = "auto") -> Dict[str, Any]:
        """
        Get an LLM answer to a question informed by Exa search results
        
        Args:
            query: The question to answer
            stream: Whether to stream the response (default: False)
            num_results: Number of search results to use (default: 5)
            search_type: Type of search - "auto", "neural", or "keyword" (default: "auto")
            
        Returns:
            Dictionary containing answer and citations
        """
        if not self.api_key:
            logger.error("EXA_API_KEY not set, cannot get answer")
            return {"answer": "", "citations": []}
        
        try:
            headers = {
                "x-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            
            # Build request payload
            payload = {
                "query": query,
                "stream": stream,
                "numResults": num_results,
                "searchType": search_type
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/answer",
                    headers=headers,
                    json=payload,
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Format response for our application
                    formatted_response = {
                        "answer": data.get("answer", ""),
                        "citations": data.get("citations", []),
                        "api": "exa_answer"
                    }
                    
                    return formatted_response
                else:
                    logger.error(f"Exa answer API error: {response.status_code} - {response.text}")
                    return {"answer": "", "citations": []}
                    
        except Exception as e:
            logger.error(f"Error in Exa get_answer: {str(e)}")
            return {"answer": "", "citations": []}


class TavilySearch:
    """
    Integration with Tavily API for web search
    """
    def __init__(self):
        self.api_key = os.getenv("TAVILY_API_KEY")
        self.base_url = "https://api.tavily.com/search"
        
    async def search(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Perform a search using Tavily API
        """
        if not self.api_key:
            logger.warning("TAVILY_API_KEY not found in environment variables")
            return []
        
        try:
            headers = {
                "Content-Type": "application/json"
            }
            
            payload = {
                "api_key": self.api_key,
                "query": query,
                "search_depth": "advanced",
                "max_results": num_results
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    
                    for result in data.get("results", []):
                        results.append({
                            "content": result.get("content", ""),
                            "source": result.get("url", ""),
                            "title": result.get("title", ""),
                            "api": "tavily"
                        })
                    
                    return results
                else:
                    logger.error(f"Tavily API error: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error in Tavily search: {str(e)}")
            return []


class FirecrawlSearch:
    """
    Integration with Firecrawl API for web search
    """
    def __init__(self):
        self.api_key = os.getenv("FIRECRAWL_API_KEY")
        self.base_url = "https://api.firecrawl.dev/search"
        
    async def search(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Perform a search using Firecrawl API
        """
        if not self.api_key:
            logger.warning("FIRECRAWL_API_KEY not found in environment variables")
            return []
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "query": query,
                "limit": num_results
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    
                    for result in data.get("results", []):
                        results.append({
                            "content": result.get("snippet", ""),
                            "source": result.get("url", ""),
                            "title": result.get("title", ""),
                            "api": "firecrawl"
                        })
                    
                    return results
                else:
                    logger.error(f"Firecrawl API error: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error in Firecrawl search: {str(e)}")
            return []


async def fetch_content(urls: List[str]) -> List[Dict[str, Any]]:
    """
    Fetch content from a list of URLs using Exa API
    
    Args:
        urls: List of URLs to fetch content for
        
    Returns:
        List of content results with metadata
    """
    exa = ExaSearch()
    
    try:
        # Use Exa's content API to fetch full page contents
        results = await exa.get_contents(urls, get_text=True, get_summary=True)
        return results
    except Exception as e:
        logger.error(f"Error fetching content: {str(e)}")
        return []


async def search_all_apis(queries: List[str]) -> List[Dict[str, Any]]:
    """
    Perform parallel searches across all search APIs
    
    Args:
        queries: List of search queries to execute in parallel
        
    Returns:
        List of search results with content and metadata
    """
    exa = ExaSearch()
    tavily = TavilySearch()
    firecrawl = FirecrawlSearch()
    
    all_results = []
    
    # Create tasks for parallel execution across all queries and APIs
    all_tasks = []
    for query in queries:
        # Prioritize Exa search as it provides more comprehensive results
        all_tasks.append((query, exa.search(query, num_results=3, get_summary=True)))
        
        # Add other search APIs as fallbacks
        if os.getenv("TAVILY_API_KEY"):
            all_tasks.append((query, tavily.search(query, num_results=2)))
        if os.getenv("FIRECRAWL_API_KEY"):
            all_tasks.append((query, firecrawl.search(query, num_results=2)))
    
    # Execute all search tasks in parallel
    for query, task in all_tasks:
        try:
            result = await task
            if result:
                # Add query information to each result
                for item in result:
                    if "query" not in item:
                        item["query"] = query
                all_results.extend(result)
        except Exception as e:
            logger.error(f"API search error for query '{query}': {str(e)}")
    
    # If we have URLs but no content, fetch content for those URLs
    urls_to_fetch = []
    url_to_index_map = {}
    
    for i, result in enumerate(all_results):
        if result.get("url") and (not result.get("content") or len(result.get("content", "")) < 100):
            url = result.get("url")
            urls_to_fetch.append(url)
            url_to_index_map[url] = i
    
    # If we have URLs to fetch, use Exa's content API
    if urls_to_fetch and os.getenv("EXA_API_KEY"):
        try:
            # Fetch content in batches of 5 to avoid overloading the API
            for i in range(0, len(urls_to_fetch), 5):
                batch_urls = urls_to_fetch[i:i+5]
                contents = await exa.get_contents(batch_urls)
                
                # Update results with fetched content
                for content_result in contents:
                    url = content_result.get("url")
                    if url in url_to_index_map:
                        idx = url_to_index_map[url]
                        # Update with more comprehensive content
                        all_results[idx]["content"] = content_result.get("content", all_results[idx].get("content", ""))
                        # Add summary if available
                        if content_result.get("summary") and "summary" not in all_results[idx]:
                            all_results[idx]["summary"] = content_result.get("summary")
        except Exception as e:
            logger.error(f"Error fetching content: {str(e)}")
    
    # Sort results by score if available, otherwise keep original order
    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    return all_results
