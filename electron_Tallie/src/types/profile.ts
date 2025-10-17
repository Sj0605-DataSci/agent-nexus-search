export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  has_connections?: "synced" | "syncing" | "no_data";
  hired_agents?: string[];
  linkedin_url?: string;
  email_subscription?: boolean;
  founders_connection?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  status_code: number;
  message: string;
  data: T;
}
