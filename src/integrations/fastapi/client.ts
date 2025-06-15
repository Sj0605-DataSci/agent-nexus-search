import { supabase } from "@/integrations/supabase/client";
import { 
  AgentTemplate, 
  AgentTemplateCreate, 
  AgentTemplateUpdate,
  HiredAgent,
  HiredAgentCreate,
  HiredAgentUpdate,
  Profile,
  ProfileUpdate
} from "./types";

const API_URL = "http://localhost:8000/api";

/**
 * Get authentication headers with Supabase JWT token
 */
async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * API client for interacting with the FastAPI backend
 */
export const apiClient = {
  // Agent Templates
  async getAgentTemplates(): Promise<AgentTemplate[]> {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/agent_templates`, {
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch agent templates");
    return response.json();
  },

  async getAgentTemplate(id: string): Promise<AgentTemplate> {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/agent_templates/${id}`, {
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch agent template");
    return response.json();
  },

  async createAgentTemplate(data: AgentTemplateCreate): Promise<AgentTemplate> {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/agent_templates`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create agent template");
    return response.json();
  },

  async updateAgentTemplate(id: string, data: AgentTemplateUpdate): Promise<AgentTemplate> {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/agent_templates/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update agent template");
    return response.json();
  },

  async deleteAgentTemplate(id: string) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/agent_templates/${id}`, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) throw new Error("Failed to delete agent template");
    return response;
  },

  // Hired Agents
  async getHiredAgents(): Promise<HiredAgent[]> {
    const headers = await getAuthHeader();
    console.log('Fetching hired agents with headers:', headers);
    
    try {
      const response = await fetch(`${API_URL}/hired_agents/`, { // Added trailing slash
        headers,
      });
      
      console.log('Get hired agents response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error(`Failed to fetch hired agents: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Hired agents data:', data);
      return data;
    } catch (error) {
      console.error('Error in getHiredAgents:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },

  async getHiredAgent(id: string): Promise<HiredAgent> {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/hired_agents/${id}`, {
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch hired agent");
    return response.json();
  },

  async hireAgent(data: HiredAgentCreate): Promise<HiredAgent> {
    const headers = await getAuthHeader();
    console.log('Hiring agent with data:', data);
    console.log('Using headers:', headers);
    
    try {
      const response = await fetch(`${API_URL}/hired_agents/`, { // Added trailing slash
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
      
      console.log('Hire agent response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error(`Failed to hire agent: ${response.status} ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in hireAgent:', error);
      throw error;
    }
  },

  async updateHiredAgent(id: string, data: HiredAgentUpdate): Promise<HiredAgent> {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/hired_agents/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update hired agent");
    return response.json();
  },

  async deleteHiredAgent(id: string) {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/hired_agents/${id}`, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) throw new Error("Failed to delete hired agent");
    return response;
  },
  
  async unhireAgentByTemplateId(templateId: string) {
    const headers = await getAuthHeader();
    console.log('Unhiring agent with template ID:', templateId);
    
    try {
      // First get all hired agents
      const hiredAgents = await this.getHiredAgents();
      
      // Find the hired agent with the matching template ID
      const agentToUnhire = hiredAgents.find(agent => agent.template_id === templateId);
      
      if (!agentToUnhire) {
        throw new Error(`No hired agent found with template ID: ${templateId}`);
      }
      
      // Delete the hired agent using its ID
      const response = await fetch(`${API_URL}/hired_agents/${agentToUnhire.id}`, {
        method: "DELETE",
        headers,
      });
      
      console.log('Unhire agent response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error(`Failed to unhire agent: ${response.status} ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in unhireAgentByTemplateId:', error);
      throw error;
    }
  },

  // Profile
  async getProfile(): Promise<Profile> {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/auth/me`, {
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch profile");
    return response.json();
  },

  async updateProfile(data: ProfileUpdate): Promise<Profile> {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/profiles/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update profile");
    return response.json();
  },

  // Auth
  async verifyToken() {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/auth/verify-token`, {
      method: "POST",
      headers,
    });
    if (!response.ok) throw new Error("Token verification failed");
    return response.json();
  },
};
