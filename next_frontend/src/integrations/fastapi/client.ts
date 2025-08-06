import axiosInstance from "@/lib/api/axiosInstance";
import axios from "axios";
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
  UserProfile,
} from "./types";

export const apiClient = {
  // Agent Templates
  async getAgentTemplates(): Promise<AgentTemplate[]> {
    try {
      const res = await axiosInstance.get("/agent_templates");
      return res.data?.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async fetchAgentTemplates() {
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
      return res.data?.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async createAgentTemplate(data: AgentTemplateCreate): Promise<AgentTemplate> {
    try {
      const res = await axiosInstance.post("/agent_templates", data);
      return res.data?.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async updateAgentTemplate(id: string, data: AgentTemplateUpdate): Promise<AgentTemplate> {
    try {
      const res = await axiosInstance.put(`/agent_templates/${id}`, data);
      return res.data?.data;
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
      return res.data?.data;
    } catch (error) {
      console.error("Error in getHiredAgents:", error);
      return [];
    }
  },

  async fetchHiredAgents() {
    try {
      const res = await axiosInstance.get("/hired_agents");
      return res.data;
    } catch (error) {
      console.error("Error in fetchHiredAgents:", error);
      throw new Error(handleAxiosError(error as any));
    }
  },

  async getHiredAgent(id: string): Promise<HiredAgent> {
    try {
      const res = await axiosInstance.get(`/hired_agents/${id}`);
      return res.data?.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async hireAgent(data: HiredAgentCreate): Promise<HiredAgent> {
    try {
      const res = await axiosInstance.post("/hired_agents", data);
      return res.data?.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async updateHiredAgent(id: string, data: HiredAgentUpdate): Promise<HiredAgent> {
    try {
      const res = await axiosInstance.put(`/hired_agents/${id}`, data);
      return res.data?.data;
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
      return res.data?.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async fetchProfileFromAPI(): Promise<UserProfile> {
    try {
      const res = await axiosInstance.get("/profiles");
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async updateProfile(data: ProfileUpdate): Promise<Profile> {
    try {
      const res = await axiosInstance.put("/profiles/me", data);
      return res.data?.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  // Auth
  async verifyToken() {
    try {
      const res = await axiosInstance.post("/auth/verify-token");
      return res.data?.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async signUp(email: string, password: string, fullName: string) {
    try {
      const res = await axiosInstance.post("/auth/signup", {
        email,
        password,
        full_name: fullName,
      });
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // For 409 status code (conflict - email already exists), return the response data
        if (error.response.status === 409) {
          return error.response.data;
        }
        throw new Error(handleAxiosError(error));
      }
      throw new Error(handleAxiosError(error as any));
    }
  },

  async login(email: string, password: string) {
    try {
      const res = await axiosInstance.post("/auth/login", {
        email,
        password,
      });
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async logout(): Promise<{ success: boolean; status_code: number; message: string; data: null }> {
    try {
      const res = await axiosInstance.post("/auth/logout");
      return res.data;
    } catch (error) {
      // Even if the logout API fails, we should still clear local state
      return {
        success: false,
        status_code: 500,
        message: "Failed to log out from server",
        data: null,
      };
    }
  },

  async resetPassword(email: string, redirectUrl?: string) {
    try {
      const res = await axiosInstance.post("/auth/reset-password", {
        email,
        redirect_url: redirectUrl,
      });
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async updatePassword(newPassword: string, accessToken: string, refreshToken: string) {
    try {
      const res = await axiosInstance.post("/auth/update-password", {
        new_password: newPassword,
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async handleLoginWithStorage(email: string, password: string) {
    try {
      const res = await axiosInstance.post("/auth/login", {
        email,
        password,
      });

      const responseData = res.data;

      if (responseData.success && responseData.status_code === 200) {
        localStorage.setItem("discover_minds_access_token", responseData.data.access_token);
        localStorage.setItem("discover_minds_refresh_token", responseData.data.refresh_token);

        axiosInstance.defaults.headers.common["Authorization"] =
          `Bearer ${responseData.data.access_token}`;
      }

      return responseData;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async fetchProfile() {
    try {
      const res = await axiosInstance.get("/profiles");
      return res.data;
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  // Chat
  async sendChatRequest(agentId: string, message: string): Promise<ChatResponse> {
    try {
      const chatRequest: ChatRequest = {
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

  // Connections
  async processConnectionFile(fileId: string): Promise<any> {
    try {
      const res = await axiosInstance.post("/process-connection-file", { file_id: fileId });
      return res.data?.data;
    } catch (error) {
      console.error("Error processing connection file:", error);
      throw new Error(handleAxiosError(error as any));
    }
  },

  // Chat Threads and Messages
  async getChatThreads(
    page_size: number = 20,
    page: number = 1
  ): Promise<{
    threads: any[];
    pagination: {
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  }> {
    try {
      const res = await axiosInstance.get(`/chat/threads`, {
        params: { page_size, page },
      });

      if (res.data?.success && res.data?.data) {
        return res.data.data;
      }
      return {
        threads: [],
        pagination: {
          total: 0,
          page: 1,
          page_size: page_size,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        },
      };
    } catch (error) {
      console.error("Error fetching chat threads:", error);
      return {
        threads: [],
        pagination: {
          total: 0,
          page: 1,
          page_size: page_size,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        },
      };
    }
  },

  async getChatMessages(chatThreadId: string): Promise<{ total: number; messages: any[] }> {
    try {
      const res = await axiosInstance.get(`/chat/messages/${chatThreadId}`);
      return res.data?.data || { total: 0, messages: [] };
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      return { total: 0, messages: [] };
    }
  },

  async sendFeedback(data: {
    message_id: string;
    is_positive: boolean;
    comment?: string;
  }): Promise<any> {
    try {
      const res = await axiosInstance.patch(`/chat/feedback/${data.message_id}`, {
        is_positive: data.is_positive,
        comment: data.comment || "",
      });
      return res.data?.data;
    } catch (error) {
      console.error("Error sending feedback:", error);
      throw new Error(handleAxiosError(error as any));
    }
  },

  async joinWaitlist(data: { email: string; name: string; phone_number: string }): Promise<{
    success: boolean;
    status_code: number;
    message: string;
    data: { invitee_id?: string } | null;
  }> {
    try {
      const res = await axiosInstance.post("/auth/join_waitlist", data);
      return res.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 409) {
          return error.response.data;
        }
        throw new Error(handleAxiosError(error));
      }
      throw new Error(handleAxiosError(error as any));
    }
  },

  async sendStreamingChatRequest(
    agentId: string,
    message: string,
    format: string = "table",
    searchMode: string = "basic",
    worldConnectionsMode: string = "connections",
    threadId: string = "",
    onUpdate: (update: StreamingChatUpdate) => void
  ): Promise<void> {
    const payload: StreamingChatRequest = {
      agent_id: agentId,
      messages: message,
      stream: true,
      format: format,
      search_mode: searchMode,
      world_connections: worldConnectionsMode,
      thread_id: threadId,
    };

    // Use fetch directly for SSE support
    const response = await fetch(`${axiosInstance.defaults.baseURL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          (axiosInstance.defaults.headers.common["Authorization"] as string) ||
          `Bearer ${localStorage.getItem("discover_minds_access_token")}`,
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
      const events = text.split("\n\n");

      for (const event of events) {
        if (event.trim() === "") continue;

        // Parse the SSE event
        const eventLines = event.split("\n");
        let eventData = "";

        for (const line of eventLines) {
          if (line.startsWith("data: ")) {
            eventData = line.slice(6); // Remove 'data: ' prefix
          }
        }

        if (eventData) {
          try {
            const update = JSON.parse(eventData) as StreamingChatUpdate;
            onUpdate(update);
            console.log("Received SSE update:", update);
          } catch (e) {
            console.error("Error parsing SSE message:", e);
          }
        }
      }
    }
  },
};
