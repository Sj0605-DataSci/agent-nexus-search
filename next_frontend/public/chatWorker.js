// Web Worker for handling intensive chat operations

// Process message content (formatting, parsing, etc.)
function processMessageContent(content) {
  // If content is an object, stringify it
  if (typeof content === 'object' && content !== null) {
    return JSON.stringify(content, null, 2);
  }
  return content;
}

// Process search results
function processSearchResults(sources) {
  // Organize and format sources
  return sources.map(source => {
    // Add any processing logic here
    return {
      ...source,
      processed: true
    };
  });
}

// Handle incoming messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'process_message':
      const processedContent = processMessageContent(data.content);
      self.postMessage({
        type: 'processed_message',
        data: {
          id: data.id,
          content: processedContent
        }
      });
      break;
      
    case 'process_search_results':
      const processedSources = processSearchResults(data.sources);
      self.postMessage({
        type: 'processed_search_results',
        data: {
          sources: processedSources
        }
      });
      break;
      
    case 'analyze_query':
      // Perform query analysis (keywords extraction, etc.)
      const keywords = data.query.toLowerCase()
        .split(' ')
        .filter(word => word.length > 3)
        .slice(0, 5);
      
      self.postMessage({
        type: 'query_analysis',
        data: {
          originalQuery: data.query,
          keywords,
          suggestedQueries: generateSuggestedQueries(data.query, keywords)
        }
      });
      break;
      
    default:
      console.error('Unknown message type:', type);
  }
});

// Generate suggested queries based on the original query
function generateSuggestedQueries(query, keywords) {
  const suggestions = [];
  
  if (keywords.length > 0) {
    // Add a suggestion with the first keyword
    suggestions.push(`Find people with ${keywords[0]} experience`);
    
    // If there are multiple keywords, combine them
    if (keywords.length > 1) {
      suggestions.push(`Experts in ${keywords.slice(0, 2).join(' and ')}`);
    }
    
    // Add a more specific suggestion
    suggestions.push(`${query} with leadership experience`);
  }
  
  return suggestions;
}
