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
  ChatRequest,
  ChatResponse,
  StreamingChatRequest,
  StreamingChatUpdate,
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

  // Chat
  async sendChatRequest(userId: string, agentId: string, message: string): Promise<ChatResponse> {
    try {
      const chatRequest: ChatRequest = {
        user_id: userId,
        agent_id: agentId,
        messages: message,
      };

      const res = await axiosInstance.post("/chat", chatRequest);
      return res.data.data; // Return the data field from StandardResponse
    } catch (error) {
      console.error("Error in sendChatRequest:", error);
      throw new Error(handleAxiosError(error as any));
    }
  },

  async sendStreamingChatRequest(
    userId: string,
    agentId: string,
    message: string,
    onUpdate: (update: StreamingChatUpdate) => void
  ): Promise<void> {
    const payload: StreamingChatRequest = {
      user_id: userId,
      agent_id: agentId,
      messages: message,
      stream: true,
    };

    // Use fetch directly for SSE support
    const response = await fetch(`${axiosInstance.defaults.baseURL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    // Handle the SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No reader available");
    }

    // Process the stream
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const text = decoder.decode(value);
      const lines = text.split("\n\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonStr = line.slice(6); // Remove 'data: ' prefix
            const update = JSON.parse(jsonStr) as StreamingChatUpdate;
            onUpdate(update);
          } catch (e) {
            console.error("Error parsing SSE message:", e);
          }
        }
      }
    }
  },
};
