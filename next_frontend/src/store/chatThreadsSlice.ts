import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ChatThread } from "@/integrations/fastapi/types";
import { apiClient } from "@/integrations/fastapi/client";

interface ChatThreadsState {
  threads: ChatThread[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  hasMore: boolean;
  pageSize: number;
  totalThreads: number;
  totalPages: number;
}

const initialState: ChatThreadsState = {
  threads: [],
  loading: false,
  error: null,
  currentPage: 1,
  hasMore: true,
  pageSize: 20,
  totalThreads: 0,
  totalPages: 0,
};

export const fetchChatThreads = createAsyncThunk(
  "chatThreads/fetchChatThreads",
  async (_, { getState, rejectWithValue }) => {
    const { chatThreads } = getState() as { chatThreads: ChatThreadsState };
    const { pageSize } = chatThreads;
    
    try {
      const response = await apiClient.getChatThreads(pageSize, 1);
      return response;
    } catch (error) {
      return rejectWithValue("Failed to fetch chat threads");
    }
  }
);

export const loadMoreChatThreads = createAsyncThunk(
  "chatThreads/loadMoreChatThreads",
  async (_, { getState, rejectWithValue }) => {
    const { chatThreads } = getState() as { chatThreads: ChatThreadsState };
    const { pageSize, currentPage, hasMore } = chatThreads;
    
    if (!hasMore) return null;
    
    try {
      // Always use 10 for page size in pagination as per API requirements
      const nextPage = currentPage + 1;
      const response = await apiClient.getChatThreads(10, nextPage);
      return response;
    } catch (error) {
      return rejectWithValue("Failed to load more chat threads");
    }
  }
);

const chatThreadsSlice = createSlice({
  name: "chatThreads",
  initialState,
  reducers: {
    resetChatThreads: (state) => {
      state.threads = [];
      state.currentPage = 1;
      state.hasMore = true;
      state.totalThreads = 0;
      state.totalPages = 0;
      state.loading = false;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatThreads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatThreads.fulfilled, (state, action) => {
        if (!action.payload) return;
        
        state.threads = action.payload.threads;
        state.totalThreads = action.payload.pagination.total;
        state.currentPage = action.payload.pagination.page;
        state.totalPages = action.payload.pagination.total_pages;
        state.hasMore = action.payload.pagination.has_next;
        state.loading = false;
      })
      .addCase(fetchChatThreads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadMoreChatThreads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMoreChatThreads.fulfilled, (state, action) => {
        if (!action.payload) return;
        
        // Filter out duplicates
        const existingIds = new Set(state.threads.map(thread => thread.id));
        const newThreads = action.payload.threads.filter(thread => !existingIds.has(thread.id));
        
        // Properly concatenate new threads to existing threads
        state.threads = [...state.threads, ...newThreads];
        state.totalThreads = action.payload.pagination.total;
        state.currentPage = action.payload.pagination.page;
        state.totalPages = action.payload.pagination.total_pages;
        state.hasMore = action.payload.pagination.has_next;
        state.loading = false;
      })
      .addCase(loadMoreChatThreads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetChatThreads, setPageSize, setLoading } = chatThreadsSlice.actions;
export default chatThreadsSlice.reducer;
