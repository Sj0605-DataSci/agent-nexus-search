import axiosInstance from "@/lib/api/axiosInstance";
import axios from "axios";
import { handleAxiosError } from "@/lib/api/handleAxiosError";
import { getDeviceInfo } from "@/utils/deviceInfo";
import toast from "react-hot-toast";
import { getStoredToken } from "@/utils/tokenManagement";

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
  UsageStats,
  SignUpResponse,
} from "./types";

// Add setAuthToken to axios instance
export const setAuthToken = (token: string) => {
  if (token) {
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common["Authorization"];
  }
};

export const apiClient = {
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

  async updateProfile(data: ProfileUpdate): Promise<UserProfile> {
    try {
      const res = await axiosInstance.put("/profiles", data);
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

  async userSignUp(
    email: string,
    password: string,
    fullName: string,
    linkedinUrl: string,
    phoneNumber: string
  ): Promise<SignUpResponse> {
    try {
      const { supabaseHandler } = await import("@/integrations/supabase/client");

      const { data, error } = await supabaseHandler.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            linkedin_url: linkedinUrl,
            phone_number: phoneNumber,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        status_code: 201,
        data: {
          user: data.user,
          session: data.session,
          access_token: data.session?.access_token,
          refresh_token: data.session?.refresh_token,
        },
      };
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
        redirect_url: redirectUrl + "/update-password",
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
      const { supabaseHandler } = await import("@/integrations/supabase/client");

      const { data, error } = await supabaseHandler.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        localStorage.setItem("discover_minds_access_token", data.session.access_token);
        localStorage.setItem("discover_minds_refresh_token", data.session.refresh_token);

        axiosInstance.defaults.headers.common["Authorization"] =
          `Bearer ${data.session.access_token}`;
      }

      return {
        success: true,
        status_code: 200,
        data: {
          access_token: data.session?.access_token,
          refresh_token: data.session?.refresh_token,
          user: data.user,
        },
      };
    } catch (error) {
      throw new Error(handleAxiosError(error as any));
    }
  },

  async getUsageStats(days: number): Promise<UsageStats> {
    try {
      const res = await axiosInstance.get(`/profiles/usage_stats?days=${days}`);
      return res.data?.data;
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

  async joinWaitlist(data: {
    email: string;
    name: string;
    phone_number: string;
    linkedin_url: string;
  }): Promise<{
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

  async joinWaitlistEmail(email: string): Promise<{
    success: boolean;
    status_code: number;
    message: string;
    data: { invitee_id?: string } | null;
  }> {
    try {
      const data = {
        email,
      };
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
    threadId: string = "",
    onUpdate: (update: StreamingChatUpdate) => void
  ): Promise<void> {
    const { deviceId, ipAddress, deviceType } = await getDeviceInfo({ skipIpLookup: false });

    const accessToken = await Promise.resolve(getStoredToken());
    const payload: StreamingChatRequest = {
      messages: message,
      ...(!accessToken
        ? {}
        : {
            stream: true,
            agent_id: agentId,
            format: "table",
            search_mode: "basic",
            world_connections: "connections",
            thread_id: threadId,
          }),
    };
    const endpoint = accessToken ? "/chat/stream" : "/chat/public/stream";

    try {
      const response = await fetch(`${axiosInstance.defaults.baseURL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          "X-Device-ID": deviceId,
          "X-Device-Type": deviceType,
          ...(ipAddress ? { "X-Client-IP": ipAddress } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();

          if (response.status === 429 || response.status === 499) {
            const errorMessage =
              errorData?.message ||
              "You've reached the maximum number of free searches. Please try again later or sign up for more.";
            toast.error(errorMessage, { id: "rate-limit-error", duration: 5000 });
            throw new Error(errorMessage);
          } else {
            const errorMessage =
              errorData?.message || "Something went wrong. Please try again later.";
            toast.error(errorMessage);
            throw new Error(`Error: ${response.status} ${response.statusText} - ${errorMessage}`);
          }
        } catch (parseError) {
          // toast.error("Something went wrong. Please try again later.");
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

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
    } catch (error: any) {
      console.error("Error in streaming chat request:", error);
      toast.dismiss();
      if (
        error.message &&
        (error.message.includes("429") ||
          error.message.includes("rate limit") ||
          error.message.includes("maximum number of free searches"))
      ) {
        const errorMessage = error.message.includes("Error:")
          ? error.message.split(" - ")[1]
          : error.message;
        toast.error(
          errorMessage ||
            "You've reached the maximum number of free searches. Please try again later.",
          {
            id: "rate-limit-error",
            duration: 5000,
          }
        );
      } else {
        toast.error("Connection error. Please try again later.", {
          id: "connection-error",
          duration: 3000,
        });
      }

      return Promise.reject({
        error: true,
        message: error.message || "Connection error",
        isRateLimit:
          error.message &&
          (error.message.includes("429") ||
            error.message.includes("rate limit") ||
            error.message.includes("maximum number of free searches")),
        originalError: error,
      });
    }
  },
};
