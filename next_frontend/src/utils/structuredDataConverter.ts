import { EnhancedProfile } from "@/types/enhancedProfile";

interface StructuredDataRow {
  fname?: string;
  lname?: string;
  link?: string;
  headline?: string;
  company?: string;
  position?: string;
  location?: string;
  profile_photo_url?: string;
  yes_score?: number;
  maybe_score?: number;
  no_score?: number;
  quotes?: string[];
  mutual_connection?: string;
  [key: string]: any;
}

/**
 * Converts structured table data to enhanced profile format
 */
export const convertStructuredDataToEnhancedProfiles = (content: string): EnhancedProfile[] => {
  try {
    // Parse the structured data
    const lines = content.split('\n').filter(line => line.trim());
    const profiles: EnhancedProfile[] = [];
    
    // Look for data patterns in the content
    const dataPattern = /\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g;
    let match;
    
    while ((match = dataPattern.exec(content)) !== null) {
      const [, name, company, scores, quotes, mutuals, link] = match.map(s => s?.trim() || '');
      
      // Parse name
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Parse scores from the scores column (looking for numbers)
      const scoreNumbers = scores.match(/\d+/g) || [];
      const yesScore = parseInt(scoreNumbers[0] || '0') || 0;
      const maybeScore = parseInt(scoreNumbers[1] || '0') || 0;
      const noScore = parseInt(scoreNumbers[2] || '0') || 0;
      
      // Parse quotes
      const quotesArray = quotes && quotes !== 'No quotes' 
        ? quotes.split(';').map(q => q.trim().replace(/^"|"$/g, ''))
        : [];
      
      // Create enhanced profile
      const profile: EnhancedProfile = {
        id: `${firstName}_${lastName}_${Date.now()}`,
        first_name: firstName,
        last_name: lastName,
        headline: company || '',
        company: company || '',
        position: '',
        location: '',
        linkedin_url: link || '',
        profile_photo_url: '',
        yes_score: {
          confidence: yesScore,
          quotes: quotesArray.filter((_, i) => i % 3 === 0), // Distribute quotes
          matching_traits: yesScore > 0 ? ['Strong match', 'Relevant experience'] : []
        },
        maybe_score: {
          confidence: maybeScore,
          quotes: quotesArray.filter((_, i) => i % 3 === 1),
          matching_traits: maybeScore > 0 ? ['Partial match', 'Some relevance'] : []
        },
        no_score: {
          confidence: noScore,
          quotes: quotesArray.filter((_, i) => i % 3 === 2),
          matching_traits: noScore > 0 ? ['Not a match', 'Different focus'] : []
        },
        all_quotes: quotesArray,
        mutual_connection: mutuals && mutuals !== 'No mutual' ? mutuals : ''
      };
      
      profiles.push(profile);
    }
    
    return profiles;
  } catch (error) {
    console.error('Error converting structured data:', error);
    return [];
  }
};

/**
 * Detects if content is structured table data that can be converted
 */
export const isConvertibleStructuredData = (content: string): boolean => {
  if (!content) return false;
  
  // Check for table-like structure with profile data
  const hasTableStructure = content.includes('|') && content.includes('fname') && content.includes('lname');
  const hasScoreColumns = /\d+/.test(content) && (content.includes('Yes') || content.includes('Maybe') || content.includes('No'));
  
  return hasTableStructure || hasScoreColumns;
};

/**
 * Extracts profile data from the current table format visible in the screenshot
 */
export const extractProfilesFromCurrentFormat = (content: string): EnhancedProfile[] => {
  const profiles: EnhancedProfile[] = [];
  
  // This is a more specific parser for the current format we see in the screenshot
  // Looking for patterns like "Samarth Bagga" with scores
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for name patterns
    const nameMatch = line.match(/([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
    if (nameMatch) {
      const [, firstName, lastName] = nameMatch;
      
      // Look for scores in subsequent lines or same line
      const scoreContext = lines.slice(i, i + 3).join(' ');
      const scores = scoreContext.match(/\d+/g) || [];
      
      // Create profile with mock data for now
      const profile: EnhancedProfile = {
        id: `${firstName}_${lastName}_${i}`,
        first_name: firstName,
        last_name: lastName,
        headline: 'Software Engineer', // Default for now
        company: 'Tech Company',
        position: 'Software Engineer',
        location: 'Delhi, India',
        linkedin_url: `https://linkedin.com/in/${firstName?.toLowerCase() || ''}-${lastName?.toLowerCase() || ''}`,
        profile_photo_url: '',
        yes_score: {
          confidence: parseInt(scores[0] || '85') || 85,
          quotes: [
            `"${firstName} has excellent technical skills and leadership experience"`,
            `"Strong background in software development and team management"`
          ],
          matching_traits: ['Technical Leadership', 'Software Development', 'Team Management']
        },
        maybe_score: {
          confidence: parseInt(scores[1] || '20') || 20,
          quotes: [
            `"Some relevant experience but may need additional training"`,
            `"Good potential but different domain focus"`
          ],
          matching_traits: ['Transferable Skills', 'Learning Potential']
        },
        no_score: {
          confidence: parseInt(scores[2] || '100') || 100,
          quotes: [
            `"Not a good fit for this specific role"`,
            `"Different career focus and objectives"`
          ],
          matching_traits: ['Different Focus', 'Not Aligned']
        },
        all_quotes: [
          `"${firstName} has excellent technical skills and leadership experience"`,
          `"Strong background in software development and team management"`,
          `"Proven track record of delivering complex projects"`,
          `"Great communication skills and team player"`
        ],
        mutual_connection: 'John Doe'
      };
      
      profiles.push(profile);
    }
  }
  
  return profiles;
};
