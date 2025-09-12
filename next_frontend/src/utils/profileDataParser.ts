import { EnhancedProfile } from "@/types/enhancedProfile";

/**
 * Detects if message content contains enhanced profile data
 */
export const isEnhancedProfileData = (content: string): boolean => {
  if (!content) return false;

  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(content);

    // Check if it's an array of profiles with the expected structure
    if (Array.isArray(parsed)) {
      return parsed.some(
        item =>
          item &&
          typeof item === "object" &&
          "first_name" in item &&
          "last_name" in item &&
          "yes_score" in item &&
          "maybe_score" in item &&
          "no_score" in item
      );
    }

    // Check if it's a single profile object
    return (
      parsed &&
      typeof parsed === "object" &&
      "first_name" in parsed &&
      "last_name" in parsed &&
      "yes_score" in parsed &&
      "maybe_score" in parsed &&
      "no_score" in parsed
    );
  } catch (error) {
    // If JSON parsing fails, check for JSON-like patterns in the string
    const hasProfileStructure = /first_name.*last_name.*yes_score.*maybe_score.*no_score/.test(
      content
    );
    const hasJsonArrayStructure =
      (content.trim().startsWith("[") && content.trim().endsWith("]")) ||
      (content.includes('"first_name"') && content.includes('"yes_score"'));

    return hasProfileStructure && hasJsonArrayStructure;
  }
};

/**
 * Extracts enhanced profile data from message content
 */
export const extractEnhancedProfiles = (content: string): EnhancedProfile[] => {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      return parsed.map(profile => {
        // Populate all_quotes from individual score quotes if empty
        if (!profile.all_quotes || profile.all_quotes.length === 0) {
          const allQuotes = [
            ...(profile.yes_score?.quotes || []),
            ...(profile.maybe_score?.quotes || []),
            ...(profile.no_score?.quotes || []),
          ].filter(quote => quote && quote.trim());

          profile.all_quotes = allQuotes;
        }

        return sanitizeEnhancedProfile(profile);
      });
    } else if (parsed && typeof parsed === "object") {
      // Populate all_quotes for single profile
      if (!parsed.all_quotes || parsed.all_quotes.length === 0) {
        const allQuotes = [
          ...(parsed.yes_score?.quotes || []),
          ...(parsed.maybe_score?.quotes || []),
          ...(parsed.no_score?.quotes || []),
        ].filter(quote => quote && quote.trim());

        parsed.all_quotes = allQuotes;
      }

      return [sanitizeEnhancedProfile(parsed)];
    }

    return [];
  } catch (error) {
    console.error("Error parsing enhanced profile data:", error);
    return [];
  }
};

/**
 * Attempts to extract profile data from structured text content
 */
const extractProfilesFromText = (content: string): EnhancedProfile[] => {
  // This is a fallback for when profile data is embedded in markdown or other text formats
  // For now, return empty array - this could be enhanced to parse specific text patterns
  return [];
};

/**
 * Validates that a profile object has all required fields
 */
export const validateEnhancedProfile = (profile: any): profile is EnhancedProfile => {
  return (
    profile &&
    typeof profile === "object" &&
    typeof profile.first_name === "string" &&
    typeof profile.last_name === "string" &&
    typeof profile.headline === "string" &&
    typeof profile.linkedin_url === "string" &&
    profile.yes_score &&
    typeof profile.yes_score.confidence === "number" &&
    Array.isArray(profile.yes_score.quotes) &&
    Array.isArray(profile.yes_score.matching_traits) &&
    profile.maybe_score &&
    typeof profile.maybe_score.confidence === "number" &&
    Array.isArray(profile.maybe_score.quotes) &&
    Array.isArray(profile.maybe_score.matching_traits) &&
    profile.no_score &&
    typeof profile.no_score.confidence === "number" &&
    Array.isArray(profile.no_score.quotes) &&
    Array.isArray(profile.no_score.matching_traits)
  );
};

/**
 * Sanitizes and normalizes profile data
 */
export const sanitizeEnhancedProfile = (profile: any): EnhancedProfile => {
  return {
    id: profile.id || `${profile.first_name}-${profile.last_name}-${Date.now()}`,
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    headline: profile.headline || "",
    company: profile.company || "",
    position: profile.position || "",
    location: profile.location || "",
    linkedin_url: profile.linkedin_url || "",
    profile_photo_url: profile.profile_photo_url || undefined,
    all_quotes: Array.isArray(profile.all_quotes) ? profile.all_quotes : [],
    yes_score: {
      confidence: profile.yes_score?.confidence || 0,
      quotes: Array.isArray(profile.yes_score?.quotes) ? profile.yes_score.quotes : [],
      matching_traits: Array.isArray(profile.yes_score?.matching_traits)
        ? profile.yes_score.matching_traits
        : [],
    },
    maybe_score: {
      confidence: profile.maybe_score?.confidence || 0,
      quotes: Array.isArray(profile.maybe_score?.quotes) ? profile.maybe_score.quotes : [],
      matching_traits: Array.isArray(profile.maybe_score?.matching_traits)
        ? profile.maybe_score.matching_traits
        : [],
    },
    no_score: {
      confidence: profile.no_score?.confidence || 0,
      quotes: Array.isArray(profile.no_score?.quotes) ? profile.no_score.quotes : [],
      matching_traits: Array.isArray(profile.no_score?.matching_traits)
        ? profile.no_score.matching_traits
        : [],
    },
    mutual_connection: profile.mutual_connection || undefined,
  };
};
