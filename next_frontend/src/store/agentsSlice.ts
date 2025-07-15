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
  // 👉 fetch straight from your existing apiClient
  const [templates, hired] = await Promise.all([
    apiClient.getAgentTemplates(),
    apiClient.getHiredAgents(),
  ]);
  return { templates, hired };
});

const agentsSlice = createSlice({
  name: "agents",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadAgents.pending, state => {
        state.status = "loading";
      })
      .addCase(loadAgents.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.templates = action.payload.templates;
        state.hired = action.payload.hired;
      })
      .addCase(loadAgents.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export default agentsSlice.reducer;
export const selectTemplates = (s: RootState) => s.agents.templates; // ← all available
export const selectHired = (s: RootState) => s.agents.hired; // ← hired only

export const selectAgentsStatus = (s: RootState) => s.agents.status;
export const selectAgentCards = (s: RootState) => {
  const { templates, hired } = s.agents;
  const tplById = new Map(templates.map(t => [t.id, t]));
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
      .filter(t => !hired.some(h => h.template_id === t.id))
      .map(t => ({
        id: t.id,
        name: t.name,
        avatar: getAgentAvatar(t.category),
        hired: false,
        agentImageUrl: t.image_urls,
      })),
  ];
};
