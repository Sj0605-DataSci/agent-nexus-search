import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { AgentTemplate, HiredAgent } from "@/integrations/fastapi/types";
import { apiClient } from "@/integrations/fastapi/client";
import { RootState } from "./index";
import { getAgentAvatar } from "@/constant/getAgentAvatar";

interface AgentsState {
  templates: AgentTemplate[];
  hired: HiredAgent[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AgentsState = {
  templates: [],
  hired: [],
  status: "idle",
  error: null,
};

export const loadAgents = createAsyncThunk("agents/loadAll", async () => {
  const [templates, hired] = await Promise.all([
    apiClient.fetchAgentTemplates(),
    apiClient.getHiredAgents(),
  ]);
  return { templates, hired };
});

export const fetchAgentTemplates = createAsyncThunk(
  "agents/fetchTemplates",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.fetchAgentTemplates();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch agent templates");
    }
  }
);

export const fetchHiredAgents = createAsyncThunk(
  "agents/fetchHired",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.fetchHiredAgents();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch hired agents");
    }
  }
);

const agentsSlice = createSlice({
  name: "agents",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadAgents?.pending, state => {
        state.status = "loading";
      })
      .addCase(loadAgents?.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.templates = action.payload.templates;
        state.hired = action.payload.hired;
      })
      .addCase(loadAgents?.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Unknown error";
      })
      // Handle fetchAgentTemplates thunk
      .addCase(fetchAgentTemplates.pending, state => {
        state.status = "loading";
      })
      .addCase(fetchAgentTemplates.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.status_code === 200) {
          state.status = "succeeded";
          state.templates = action.payload.data;
        } else {
          state.status = "failed";
          state.error = action.payload.message || "Failed to fetch agent templates";
        }
      })
      .addCase(fetchAgentTemplates.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) || "Failed to fetch agent templates";
      })
      // Handle fetchHiredAgents thunk
      .addCase(fetchHiredAgents?.pending, state => {
        state.status = "loading";
      })
      .addCase(fetchHiredAgents?.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.status_code === 200) {
          state.status = "succeeded";
          state.hired = action.payload.data;
        } else {
          state.status = "failed";
          state.error = action.payload.message || "Failed to fetch hired agents";
        }
      })
      .addCase(fetchHiredAgents?.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) || "Failed to fetch hired agents";
      });
  },
});

export default agentsSlice.reducer;
export const selectTemplates = (s: RootState) => s.agents?.templates || [];
export const selectHired = (s: RootState) => s.agents?.hired || [];

export const selectAgentsStatus = (s: RootState) => s.agents?.status;
export const selectAgentCards = (s: RootState) => {
  const templates = s.agents?.templates || [];
  const hired = s.agents?.hired || [];

  const tplById = new Map(templates?.map(t => [t.id, t]));

  return [
    ...hired.map(h => {
      const t = tplById.get(h.template_id);
      return {
        id: h.id,
        name: h.name ?? t?.name ?? "Unnamed",
        avatar: getAgentAvatar(t?.category),
        hired: true,
        agentImageUrl: h.image_urls,
      };
    }),
    ...templates
      ?.filter(t => !hired.some(h => h.template_id === t?.id))
      .map(t => ({
        id: t.id,
        name: t.name,
        avatar: getAgentAvatar(t.category),
        hired: false,
        agentImageUrl: t.image_urls,
      })),
  ];
};
