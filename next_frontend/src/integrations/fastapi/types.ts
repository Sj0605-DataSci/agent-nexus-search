/**
 * Type definitions for the FastAPI backend models
 */

import { UUID } from "crypto";

// Agent Template types
export interface AgentTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  created_at: string;
  updated_at: string;
  image_urls?: string;
  can_hire_unhire?: boolean;
}

export interface AgentTemplateCreate {
  name: string;
  category: string;
  description?: string;
}

export interface AgentTemplateUpdate {
  name?: string;
  category?: string;
  description?: string;
}

// Hired Agent types
export interface HiredAgent {
  id: string;
  user_id: string;
  template_id: string;
  name?: string;
  personality?: string;
  tone?: string;
  response_length?: string;
  image_urls?: string;
  expertise?: string;
  hired_at: string;
  updated_at: string;
  can_hire_unhire?: boolean;
}

export interface HiredAgentCreate {
  user_id: string;
  template_id: string;
  name: string;
  personality: string;
  tone: string;
  response_length: string;
  expertise: string;
}

export interface HiredAgentUpdate {
  name?: string;
  personality?: string;
  tone?: string;
  response_length?: string;
  expertise?: string;
}

// Profile types
export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  created_at: any;
  id: string;
  email: string;
  full_name: string;
  has_connections: boolean;
  hired_agents?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  status_code: number;
  message: string;
  data: T;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export interface ProfileUpdate {
  email?: string;
  full_name?: string;
}

// Chat types
export interface Source {
  title: string;
  value: string;
  short_url: string;
  score: number;
  summary?: string;
}

export interface ChatRequest {
  agent_id: string;
  messages: string | Array<{ content: string; type: string }>;
  format?: string;
  search_mode?: string;
  world_connections?: string;
  thread_id?: string; // Optional thread ID for tracking conversation history
}

export interface StreamingChatRequest extends ChatRequest {
  stream: boolean;
}

export interface ChatResponse {
  messages: Array<{ content: string; type: string }>;
  sources_gathered?: Source[];
  search_query?: string[];
  web_research_result?: string[];
}

export interface StreamingChatUpdate {
  type: "thinking" | "search_query" | "source" | "message" | "done" | "error" | "token" | "connected";
  content: any;
}

// Chat Thread types
export interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  last_message_at: string;
  weave_url?: string;
}
