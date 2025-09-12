export interface ProfileScore {
  confidence: number;
  quotes: string[];
  matching_traits: string[];
}

export interface EnhancedProfile {
  id: string;
  first_name: string;
  last_name: string;
  headline: string;
  company: string;
  position: string;
  location: string;
  linkedin_url: string;
  profile_photo_url?: string;
  all_quotes: string[];
  yes_score: ProfileScore;
  maybe_score: ProfileScore;
  no_score: ProfileScore;
  mutual_connection?: string;
}

export interface EnhancedProfileResponse {
  profiles: EnhancedProfile[];
  total_count: number;
  search_query?: string;
  filters_applied?: Record<string, any>;
}

export type ProfileMatchType = "yes" | "maybe" | "no";
export type ProfileSortOption =
  | "relevance"
  | "name"
  | "company"
  | "yes_score"
  | "maybe_score"
  | "no_score";
export type ProfileViewMode = "grid" | "list";
