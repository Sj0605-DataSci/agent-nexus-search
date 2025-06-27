import axiosInstance from "@/lib/api/axiosInstance";
import { handleAxiosError } from "@/lib/api/handleAxiosError";
import {
  AgentTemplate,
  AgentTemplateCreate,
  AgentTemplateUpdate,
  HiredAgent,
  HiredAgentCreate,
  HiredAgentUpdate,
  Profile,
  ProfileUpdate,
} from "./types";

export const apiClient = {
  // Agent Templates
  async getAgentTemplates(): Promise<AgentTemplate[]> {
    try {
      const res = await axiosInstance.get("/agent_templates");
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async getAgentTemplate(id: string): Promise<AgentTemplate> {
    try {
      const res = await axiosInstance.get(`/agent_templates/${id}`);
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async createAgentTemplate(data: AgentTemplateCreate): Promise<AgentTemplate> {
    try {
      const res = await axiosInstance.post("/agent_templates", data);
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async updateAgentTemplate(id: string, data: AgentTemplateUpdate): Promise<AgentTemplate> {
    try {
      const res = await axiosInstance.put(`/agent_templates/${id}`, data);
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async deleteAgentTemplate(id: string) {
    try {
      await axiosInstance.delete(`/agent_templates/${id}`);
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  // Hired Agents
  async getHiredAgents(): Promise<HiredAgent[]> {
    try {
      const res = await axiosInstance.get("/hired_agents");
      return res.data;
    } catch (error) {
      console.error("Error in getHiredAgents:", error);
      return [];
    }
  },

  async getHiredAgent(id: string): Promise<HiredAgent> {
    try {
      const res = await axiosInstance.get(`/hired_agents/${id}`);
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async hireAgent(data: HiredAgentCreate): Promise<HiredAgent> {
    try {
      const res = await axiosInstance.post("/hired_agents", data);
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async updateHiredAgent(id: string, data: HiredAgentUpdate): Promise<HiredAgent> {
    try {
      const res = await axiosInstance.put(`/hired_agents/${id}`, data);
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async deleteHiredAgent(id: string) {
    try {
      await axiosInstance.delete(`/hired_agents/${id}`);
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async unhireAgentByTemplateId(templateId: string) {
    try {
      const hiredAgents = await this.getHiredAgents();
      const agentToUnhire = hiredAgents.find(agent => agent.template_id === templateId);
      if (!agentToUnhire) {
        throw new Error(`No hired agent found with template ID: ${templateId}`);
      }

      await axiosInstance.delete(`/hired_agents/${agentToUnhire.id}`);
      return true;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  // Profile
  async getProfile(): Promise<Profile> {
    try {
      const res = await axiosInstance.get("/auth/me");
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async updateProfile(data: ProfileUpdate): Promise<Profile> {
    try {
      const res = await axiosInstance.put("/profiles/me", data);
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  // Auth
  async verifyToken() {
    try {
      const res = await axiosInstance.post("/auth/verify-token");
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },
};
