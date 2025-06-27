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
  expertise?: string;
  hired_at: string;
  updated_at: string;
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

export interface ProfileUpdate {
  email?: string;
  full_name?: string;
}
